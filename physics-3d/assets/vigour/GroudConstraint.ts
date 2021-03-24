
import { _decorator, Component, Node, Vec3, Vec4, absMaxComponent } from 'cc';
import { EIntegrateMethod } from './EnumDef';
const { ccclass, property } = _decorator;

@ccclass('GroudConstraint')
export class GroudConstraint extends Component {

    @property
    dt = 1 / 60;

    @property
    linearVelocity = new Vec3();
    linearVelocityPrev = new Vec3();

    @property
    accleration = new Vec3(0, -10, 0);

    position = new Vec3();
    positionPrev = new Vec3();

    @property({ type: EIntegrateMethod })
    integrateMethod = EIntegrateMethod.Euler_Trapezoid;

    @property
    planeEquation = new Vec4(0, 1, 0, 0);

    @property(Node)
    planeNode: Node = null!;

    @property
    sphereRadius = 0.5;

    @property
    tolerances = 1e-7;

    @property
    hard = true;

    @property
    restitution = 0;

    @property
    friction = 0;

    @property
    damping = 0;

    @property
    beta = 0;

    start () {
    }

    update (deltaTime: number) {
        this.syncNodeToParticle();
        this.solve();
        this.integrate();
        this.syncParticleToNode();
    }

    solve () {
        const x = this.position;
        const n = this.planeEquation; // v4
        const r = this.sphereRadius;
        const projection = Vec3.dot(x, n);
        const distance = projection - this.planeEquation.w - r;
        const tolerances = this.tolerances;
        const hard = this.hard;
        if (distance > tolerances) return;
        if (hard) {
            /// hard constraint (position)
            // x += distance * n
            Vec3.scaleAndAdd(x, x, n, -distance);

            /// velocity
            const v = this.linearVelocity;
            const r = this.restitution;
            const f = this.friction;
            /// apply restitution
            // vertical_v = (v n) * n  / horizontal_v = v - vertical_v /  new_v = new_vertical_v + horizontal_v
            const vertical = Vec3.dot(v, n);
            const vertical_v = Vec3.multiplyScalar(new Vec3(), n, vertical);
            const horizontal_v = Vec3.subtract(new Vec3(), v, vertical_v);
            Vec3.multiplyScalar(vertical_v, vertical_v, -r);
            Vec3.multiplyScalar(horizontal_v, horizontal_v, 1 - f * f);
            Vec3.add(v, vertical_v, horizontal_v);
        } else {
            /// soft constraint
            // JV + b = 0
            // Baumgarte Stabilization： new_v = pos_error * -b / t
            const v = this.linearVelocity;
            const b = this.beta;
            const t = this.dt;
            const pos_error = Vec3.multiplyScalar(new Vec3(), this.planeEquation, distance);
            Vec3.multiplyScalar(v, pos_error, -b / t);
        }
    }

    integrate () {
        const xp = this.positionPrev;
        const vp = this.linearVelocityPrev;
        Vec3.copy(xp, this.position);
        Vec3.copy(vp, this.linearVelocity);

        /// integrate velocity
        // v += a t
        const v = this.linearVelocity;
        const a = this.accleration;
        const t = this.dt;
        Vec3.scaleAndAdd(v, v, a, t);

        /// integrate position
        // x += v t
        // f = 0 时为前向欧拉，f = 0.5 时为梯形方式，f = 1 时为后向欧拉
        // (v * (1-f) + vp * f ) * t
        const x = this.position;
        const f = this.integrateMethod / 2;
        const newV = new Vec3();
        Vec3.multiplyScalar(newV, v, 1 - f);
        Vec3.scaleAndAdd(newV, newV, vp, f);
        Vec3.scaleAndAdd(x, x, newV, t);
        // console.log(f, newV.toString(), x.toString());
    }

    syncNodeToParticle () {
        const n = this.node;
        if (n.hasChangedFlags) {
            Vec3.copy(this.position, n.worldPosition);
            if (n.hasChangedFlags & Node.TransformBit.SCALE) {
                const part = absMaxComponent(n.worldScale);
                this.sphereRadius *= Math.abs(part);
            }
        }
        const p = this.planeNode;
        if (p) {
            if (p.hasChangedFlags) {
                /// plane equation
                // n = Unit_Y transform after Quaterion
                Vec3.transformQuat(this.planeEquation, Vec3.UNIT_Y, p.worldRotation);
                // c = position projection on normal
                this.planeEquation.w = Vec3.dot(p.worldPosition, this.planeEquation);
            }
        }
    }

    syncParticleToNode () {
        const n = this.node;
        if (!Vec3.equals(this.position, n.worldPosition)) {
            n.worldPosition = this.position;
        }
    }
}
