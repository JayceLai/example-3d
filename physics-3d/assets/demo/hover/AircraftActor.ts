
import { _decorator, Component, Node, RigidBody, PhysicsSystem, geometry, Vec3 } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

const ray = new geometry.Ray(0, 0, 0, 0, -1, 0);

@ccclass('AircraftActor')
@requireComponent(RigidBody)
export class AircraftActor extends Component {

    @property
    k = 10;

    @property
    damping = 0.1;

    @property
    beta = 0.1;

    @property
    scale = 1.5;

    @property
    mode = 0;

    _rigidBody: RigidBody = null!;
    _lastHits: number[] = [];

    start() {
        this._rigidBody = this.getComponent(RigidBody)!;
    }

    update(deltaTime: number) {
        const count = this.node.children.length;
        for (let i = 0; i < count; i++) {
            const current = this.node.children[i];
            if (current.children.length == 0) continue;
            ray.o.set(current.worldPosition);
            const L = Vec3.distance(current.worldPosition, current.children[0].worldPosition);
            if (PhysicsSystem.instance.raycastClosest(ray, 0b100, L)) {
                const r = PhysicsSystem.instance.raycastClosestResult, D = r.distance;
                const gf = PhysicsSystem.instance.gravity, ft = PhysicsSystem.instance.fixedTimeStep, force = new Vec3();
                switch (this.mode) {
                    case 0:
                        /// power function : poor stablilty
                        Vec3.multiplyScalar(force, gf, -L / D);
                        this._rigidBody.applyForce(force, current.position);
                        break;
                    case 1:
                        /// hooks law : hard stablilty
                        const forceStrength = Math.max(0, this.k * (L - D) + this.damping * (this._lastHits[i] - D));
                        Vec3.multiplyScalar(force, Vec3.UP, -forceStrength);
                        this._lastHits[i] = D;
                        this._rigidBody.applyForce(force, current.position);
                        break;
                    case 2:
                        /// constraint-position level
                        // this._rigidBody.setLinearVelocity(Vec3.ZERO);
                        // const targetPos = Vec3.multiplyScalar(new Vec3, ray.d, -(L + 0.01));
                        // Vec3.add(targetPos, r.hitPoint, targetPos);
                        // this.node.worldPosition = targetPos;

                        /// constraint-velocity level
                        // Baumgarte Stabilization： new_v = pos_error * -b / t
                        const lv = new Vec3;
                        this._rigidBody.getLinearVelocity(lv);
                        const pos_error = Vec3.multiplyScalar(new Vec3(), ray.d, L - D);
                        Vec3.multiplyScalar(lv, pos_error, -this.beta / ft);
                        this._rigidBody.setLinearVelocity(lv);

                        //  counteract gravity
                        Vec3.multiplyScalar(force, gf, -L / D);
                        this._rigidBody.applyForce(force, current.position);
                        break;
                    case 3:
                        Vec3.multiplyScalar(force, gf, -(1 - D / L) * this.scale);
                        this._rigidBody.applyForce(force, current.position);
                        break;
                }
            } else {
                this._lastHits[i] = L * 1.1;
            }
        }
        // ray
        // PhysicsSystem.instance.raycastClosest()
    }
}
