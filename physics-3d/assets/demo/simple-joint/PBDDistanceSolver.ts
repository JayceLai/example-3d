
import { _decorator, Component, Node, Vec3, SphereCollider } from 'cc';
const { ccclass, property } = _decorator;

class Particle {
    public invMass: number = 1;
    public radius: number = 0.5;
    public pos = new Vec3();
    public prevPos = new Vec3();
    public velocity = new Vec3();
    public distance = 0;
    constructor (public node: Node) {
        Vec3.copy(this.pos, node.worldPosition);
        Vec3.copy(this.prevPos, this.pos);
    }
}

@ccclass('PBDDistanceSolver')
export class PBDDistanceSolver extends Component {

    @property
    damping = 0.01;

    @property
    gravity = new Vec3(0, -10, 0);

    @property
    fixedDeltaTime = 1 / 60;

    @property
    iteration = 1;

    @property(SphereCollider)
    sphere: SphereCollider = null!;

    particles: Particle[] = [];

    start () {
        let cur = this.node;
        const particles = this.particles;
        const root = new Particle(cur);
        root.invMass = 0;
        particles.push(root);
        while (cur.children.length > 0) {
            cur = cur.children[0];
            const p = new Particle(cur); particles.push(p);
            p.distance = Vec3.distance(p.pos, particles[particles.length - 2].pos);
        }
    }

    update () {
        // Update Velocity
        const dt = this.fixedDeltaTime;
        const particles = this.particles;
        const Count = particles.length;
        const root = this.node;
        const damping = this.damping;
        const iteration = this.iteration;
        const sphere = this.sphere;
        for (let i = 1; i < Count; i++) {
            let p = particles[i];
            // Time Integration
            let vel = Vec3.scaleAndAdd(new Vec3(), p.velocity, this.gravity, dt);
            Vec3.copy(p.prevPos, p.pos);
            Vec3.scaleAndAdd(p.pos, p.pos, vel, (1 - damping) * dt);
        }

        // Resolve Constraints
        for (let n = 0; n < iteration; n++) {
            // Hard Distance Constraint
            for (let i = 1; i < Count; i++) {
                let offsetToParent = Vec3.subtract(new Vec3(), particles[i].pos, particles[i - 1].pos);
                // Strategy 1: only move child particle
                //particleList[i].pos = particleList[i-1].pos + Space * offsetToParent.normalized;
                // Strategy 2: Position Based Dynamics, iteratively
                let offsetToParentNorm = Vec3.normalize(new Vec3(), offsetToParent);
                offsetToParentNorm.multiplyScalar(particles[i].distance);
                Vec3.subtract(offsetToParent, offsetToParentNorm, offsetToParent);
                let invMassSum = particles[i - 1].invMass + particles[i].invMass;
                Vec3.scaleAndAdd(particles[i - 1].pos, particles[i - 1].pos, offsetToParent, -particles[i - 1].invMass / invMassSum);
                Vec3.scaleAndAdd(particles[i].pos, particles[i].pos, offsetToParent, particles[i].invMass / invMassSum);
            }
        }

        // Attach Root Particle to base transform
        Vec3.copy(particles[0].pos, root.worldPosition);

        // Collision Detection & Response
        if (sphere != null) {
            for (let i = 0; i < Count; i++) {
                const p = particles[i];
                if (p.invMass > 0) {
                    const swp = sphere.node.worldPosition;
                    const sd = Vec3.squaredDistance(p.pos, swp);
                    const sc = sphere.radius * sphere.node.worldScale.x + p.radius * p.node.worldScale.x;
                    if (sd < sc * sc) {
                        const v = Vec3.subtract(new Vec3(), p.pos, swp);
                        v.normalize();
                        Vec3.scaleAndAdd(p.pos, swp, v, sc);
                    }
                }
            }
        }

        // Update velocity
        Vec3.copy(particles[0].velocity, Vec3.ZERO);
        for (let i = 1; i < Count; i++) {
            Vec3.subtract(particles[i].velocity, particles[i].pos, particles[i].prevPos);
            particles[i].velocity.multiplyScalar(1 / dt);
        }

        // Apply Particle Data to Transform
        for (let i = 0; i < Count; i++) {
            particles[i].node.setWorldPosition(particles[i].pos);
        }
    }
}