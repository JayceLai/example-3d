
import { _decorator, Component, Node, Vec3, Quat, Enum, Mat4, clamp01, geometry, math, Director, director, SphereCollider } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

enum EUpdateMode {
    Normal,
    AnimatePhysics,
    UnscaledTime
}
Enum(EUpdateMode)

enum EFreezeAxis {
    None, X, Y, Z
}
Enum(EFreezeAxis)

class Particle {
    public m_Transform: Node = null!;
    public m_ParentIndex: number = -1;
    public m_Damping: number = 0;
    public m_Elasticity: number = 0;
    public m_Stiffness: number = 0;
    public m_Inert: number = 0;
    public m_Radius: number = 0;
    public m_BoneLength: number = 0;

    public m_Position = new Vec3();
    public m_PrevPosition = new Vec3();
    public m_EndOffset = new Vec3();
    public m_InitLocalPosition = new Vec3();
    public m_InitLocalRotation = new Quat();
}

@ccclass('DynamicBone')
@executeInEditMode
export class DynamicBone extends Component {
    @property(Node)
    m_Root: Node = null!;
    @property
    m_UpdateRate = 60;
    @property({ type: EUpdateMode })
    m_UpdateMode = EUpdateMode.Normal;
    @property({ type: EFreezeAxis })
    m_FreezeAxis = EFreezeAxis.None;
    @property
    m_Damping = 0.1;
    // @property
    // AnimationCurve m_DampingDistrib = null;
    @property
    m_Elasticity = 0.1;
    // @property
    // AnimationCurve m_ElasticityDistrib = null;
    @property
    m_Stiffness = 0.1;
    // @property
    // AnimationCurve m_StiffnessDistrib = null;
    @property
    m_Inert = 0;
    // @property
    // AnimationCurve m_InertDistrib = null;
    @property
    m_Radius = 0;
    // @property
    // AnimationCurve m_RadiusDistrib = null;
    @property
    m_EndLength = 0;
    @property
    m_EndOffset = new Vec3();
    @property
    m_Gravity = new Vec3();
    @property
    m_Force = new Vec3();
    @property({ type: [SphereCollider] })
    m_Colliders: SphereCollider[] = [];
    @property({ type: [Node] })
    m_Exclusions: Node[] = [];

    @property(Node)
    m_ReferenceObject: Node = null!;
    @property
    m_DistantDisable = false;
    @property
    m_DistanceToObject = 20;
    @property
    m_UseFixStep = true;

    m_LocalGravity = new Vec3();
    m_ObjectMove = new Vec3();
    m_ObjectPrevPosition = new Vec3();
    m_BoneTotalLength = 0;
    m_ObjectScale = 1.0;
    m_Time = 0;
    m_Weight = 1.0;
    m_DistantDisabled = false;

    m_Particles: Particle[] = [];
    m_deltaTime = 0;

    start () {
        this.SetupParticles();
    }

    update (dt: number) {
        this.m_deltaTime = dt;
        if (this.m_UpdateMode != EUpdateMode.AnimatePhysics) this.PreUpdate();
    }

    onEnable () {
        director.on(Director.EVENT_BEFORE_DRAW, this.LastUpdate, this);
        this.ResetParticlesPosition();
    }

    onDisable () {
        director.off(Director.EVENT_BEFORE_DRAW, this.LastUpdate, this);
        this.InitTransforms();
    }

    FixedUpdate () {
        if (this.m_UpdateMode == EUpdateMode.AnimatePhysics) this.PreUpdate();
    }

    LastUpdate () {
        const dt = this.m_deltaTime;
        const m_Weight = this.m_Weight;
        const m_DistantDisable = this.m_DistantDisable;
        const m_DistantDisabled = this.m_DistantDisabled;
        if (m_DistantDisable)
            this.CheckDistance();

        if (m_Weight > 0 && !(m_DistantDisable && m_DistantDisabled)) {
            this.UpdateDynamicBones(dt);
        }
    }

    PreUpdate () {
        if (this.m_Weight > 0 && !(this.m_DistantDisable && this.m_DistantDisabled))
            this.InitTransforms();
    }

    CheckDistance () {
        const rt = this.m_ReferenceObject;
        const m_DistanceToObject = this.m_DistanceToObject;
        // if (rt == null && Camera.main != null)
        //     rt = Camera.main.transform;
        if (rt != null) {
            let d = Vec3.squaredDistance(rt.worldPosition, this.node.worldPosition);
            let disable = d > m_DistanceToObject * m_DistanceToObject;
            if (disable != this.m_DistantDisabled) {
                if (!disable) this.ResetParticlesPosition();
                this.m_DistantDisabled = disable;
            }
        }
    }

    UpdateDynamicBones (t: number) {
        const m_Root = this.m_Root;
        const m_ObjectMove = this.m_ObjectMove;
        const m_UpdateRate = this.m_UpdateRate;
        const m_UseFixStep = this.m_UseFixStep;
        const m_ObjectPrevPosition = this.m_ObjectPrevPosition;
        if (m_Root == null)
            return;

        this.m_ObjectScale = Math.abs(this.node.worldScale.x);
        Vec3.subtract(m_ObjectMove, this.node.worldPosition, m_ObjectPrevPosition);
        Vec3.copy(m_ObjectPrevPosition, this.node.worldPosition);

        let loop = 1;
        if (!m_UseFixStep) {
            if (m_UpdateRate > 0) {
                let dt = 1.0 / m_UpdateRate;
                this.m_Time += t; loop = 0;
                while (this.m_Time >= dt) {
                    this.m_Time -= dt;
                    if (++loop >= 3) { this.m_Time = 0; break; }
                }
            }
        }

        if (loop > 0) {
            for (let i = 0; i < loop; ++i) {
                this.UpdateParticles1();
                this.UpdateParticles2();
                Vec3.copy(m_ObjectMove, Vec3.ZERO);
            }
        } else {
            this.SkipUpdateParticles();
        }

        this.ApplyParticlesToTransforms();
    }

    SetupParticles () {
        const m_Root = this.m_Root;
        const m_Particles = this.m_Particles;
        const m_Gravity = this.m_Gravity;
        const m_LocalGravity = this.m_LocalGravity;
        m_Particles.length = 0;
        if (m_Root == null)
            return;

        const invertWrorldRotation = Quat.conjugate(new Quat(), m_Root.worldRotation);
        Vec3.transformQuat(m_LocalGravity, m_Gravity, invertWrorldRotation);
        this.m_ObjectScale = Math.abs(this.node.worldScale.x);
        Vec3.copy(this.m_ObjectPrevPosition, this.node.worldPosition);
        Vec3.copy(this.m_ObjectMove, Vec3.ZERO);
        this.m_BoneTotalLength = 0;
        this.AppendParticles(m_Root, -1, 0);
        this.UpdateParameters();
    }

    AppendParticles (b: Node, parentIndex: number, boneLength: number) {
        const m_Particles = this.m_Particles;
        const m_EndLength = this.m_EndLength;
        const m_EndOffset = this.m_EndOffset;
        const m_Exclusions = this.m_Exclusions;
        const p: Particle = new Particle();
        p.m_Transform = b;
        p.m_ParentIndex = parentIndex;
        if (b != null) {
            Vec3.copy(p.m_PrevPosition, b.worldPosition);
            Vec3.copy(p.m_Position, p.m_PrevPosition);
            Vec3.copy(p.m_InitLocalPosition, b.position);
            Quat.copy(p.m_InitLocalRotation, b.rotation);
        } else { 	// end bone
            let pb = m_Particles[parentIndex].m_Transform;
            if (m_EndLength > 0) {
                let ppb = pb.parent;
                if (ppb != null) {
                    const invertTransform = Mat4.invert(new Mat4(), pb.worldMatrix);
                    const pos = Vec3.negate(new Vec3(), ppb.worldPosition);
                    Vec3.scaleAndAdd(pos, pos, pb.worldPosition, 2);
                    Vec3.transformMat4(p.m_EndOffset, pos, invertTransform);
                    Vec3.multiplyScalar(p.m_EndOffset, p.m_EndOffset, m_EndLength);
                } else {
                    p.m_EndOffset.set(m_EndLength, 0, 0);
                }
            } else {
                const temp = Vec3.transformQuat(new Vec3(), m_EndOffset, this.node.worldRotation);
                Vec3.add(temp, temp, pb.worldPosition);
                const invertTransform = Mat4.invert(new Mat4(), pb.worldMatrix);
                Vec3.transformMat4(p.m_EndOffset, temp, invertTransform);
            }
            const pos = Vec3.transformMat4(new Vec3(), p.m_EndOffset, pb.worldMatrix);
            Vec3.copy(p.m_Position, pos);
            Vec3.copy(p.m_PrevPosition, pos);
        }

        if (parentIndex >= 0) {
            boneLength += Vec3.distance(m_Particles[parentIndex].m_Transform.worldPosition, p.m_Position);
            p.m_BoneLength = boneLength;
            this.m_BoneTotalLength = Math.max(this.m_BoneTotalLength, boneLength);
        }

        const index = m_Particles.length;
        m_Particles.push(p);

        if (b != null) {
            for (let i = 0; i < b.children.length; ++i) {
                let exclude = false;
                if (m_Exclusions != null) {
                    for (let j = 0; j < m_Exclusions.length; ++j) {
                        let e = m_Exclusions[j];
                        if (e == b.children[i]) {
                            exclude = true;
                            break;
                        }
                    }
                }
                if (!exclude)
                    this.AppendParticles(b.children[i], index, boneLength);
                else if (m_EndLength > 0 || !Vec3.equals(m_EndOffset, Vec3.ZERO))
                    this.AppendParticles(null as any, index, boneLength);
            }

            if (b.children.length == 0 && (m_EndLength > 0 || !Vec3.equals(m_EndOffset, Vec3.ZERO)))
                this.AppendParticles(null as any, index, boneLength);
        }
    }

    UpdateParameters () {
        const m_Root = this.m_Root;
        const m_Gravity = this.m_Gravity;
        const m_Particles = this.m_Particles;
        const m_LocalGravity = this.m_LocalGravity;
        const m_BoneTotalLength = this.m_BoneTotalLength;
        if (m_Root == null)
            return;


        const invertWrorldRotation = Quat.conjugate(new Quat(), m_Root.worldRotation);
        Vec3.transformQuat(m_LocalGravity, m_Gravity, invertWrorldRotation);

        for (let i = 0; i < m_Particles.length; ++i) {
            let p = m_Particles[i];
            p.m_Damping = this.m_Damping;
            p.m_Elasticity = this.m_Elasticity;
            p.m_Stiffness = this.m_Stiffness;
            p.m_Inert = this.m_Inert;
            p.m_Radius = this.m_Radius;

            if (m_BoneTotalLength > 0) {
                //     const a = p.m_BoneLength / m_BoneTotalLength;
                //     if (m_DampingDistrib != null && m_DampingDistrib.keys.Length > 0)
                //         p.m_Damping *= m_DampingDistrib.Evaluate(a);
                //     if (m_ElasticityDistrib != null && m_ElasticityDistrib.keys.Length > 0)
                //         p.m_Elasticity *= m_ElasticityDistrib.Evaluate(a);
                //     if (m_StiffnessDistrib != null && m_StiffnessDistrib.keys.Length > 0)
                //         p.m_Stiffness *= m_StiffnessDistrib.Evaluate(a);
                //     if (m_InertDistrib != null && m_InertDistrib.keys.Length > 0)
                //         p.m_Inert *= m_InertDistrib.Evaluate(a);
                //     if (m_RadiusDistrib != null && m_RadiusDistrib.keys.Length > 0)
                //         p.m_Radius *= m_RadiusDistrib.Evaluate(a);
            }

            p.m_Damping = clamp01(p.m_Damping);
            p.m_Elasticity = clamp01(p.m_Elasticity);
            p.m_Stiffness = clamp01(p.m_Stiffness);
            p.m_Inert = clamp01(p.m_Inert);
            p.m_Radius = Math.max(p.m_Radius, 0);
        }
    }

    InitTransforms () {
        const m_Particles = this.m_Particles;
        for (let i = 0; i < m_Particles.length; ++i) {
            const p = m_Particles[i];
            if (p.m_Transform != null) {
                p.m_Transform.position = p.m_InitLocalPosition;
                p.m_Transform.rotation = p.m_InitLocalRotation;
            }
        }
    }

    ResetParticlesPosition () {
        const m_Particles = this.m_Particles;
        for (let i = 0; i < m_Particles.length; ++i) {
            const p = m_Particles[i];
            if (p.m_Transform != null) {
                Vec3.copy(p.m_Position, p.m_Transform.worldPosition);
                Vec3.copy(p.m_PrevPosition, p.m_Transform.worldPosition);
            } else {	// end bone
                const pb = m_Particles[p.m_ParentIndex].m_Transform;
                Vec3.transformMat4(p.m_Position, p.m_EndOffset, pb.worldMatrix);
                Vec3.copy(p.m_PrevPosition, p.m_Position);
            }
        }
        Vec3.copy(this.m_ObjectPrevPosition, this.node.worldPosition);
    }

    UpdateParticles1 () {
        const m_Particles = this.m_Particles;
        const force = Vec3.copy(new Vec3(), this.m_Gravity);
        const fdir = Vec3.normalize(new Vec3(), this.m_Gravity);
        const rf = Vec3.transformQuat(new Vec3(), this.m_LocalGravity, this.m_Root.worldRotation);
        const pf = Vec3.multiplyScalar(new Vec3(), fdir, Math.max(Vec3.dot(rf, fdir), 0));	// project current gravity to rest gravity
        Vec3.subtract(force, force, pf);	// remove projected gravity
        Vec3.add(force, force, this.m_Force);
        Vec3.multiplyScalar(force, force, this.m_ObjectScale);

        for (let i = 0; i < m_Particles.length; ++i) {
            const p = m_Particles[i];
            if (p.m_ParentIndex >= 0) {
                // verlet integration
                const v = Vec3.subtract(new Vec3(), p.m_Position, p.m_PrevPosition);
                const rmove = Vec3.multiplyScalar(new Vec3(), this.m_ObjectMove, p.m_Inert);
                Vec3.add(p.m_PrevPosition, p.m_Position, rmove);
                Vec3.scaleAndAdd(v, force, v, 1 - p.m_Damping);
                Vec3.add(v, v, rmove);
                Vec3.add(p.m_Position, p.m_Position, v);
            } else {
                Vec3.copy(p.m_PrevPosition, p.m_Position);
                Vec3.copy(p.m_Position, p.m_Transform.worldPosition);
            }
        }
    }

    UpdateParticles2 () {
        const m_Weight = this.m_Weight;
        const m_Particles = this.m_Particles;
        const m_FreezeAxis = this.m_FreezeAxis;
        const movePlane = new geometry.Plane();
        for (let i = 1; i < m_Particles.length; ++i) {
            const p = m_Particles[i];
            const p0 = m_Particles[p.m_ParentIndex];

            let restLen;
            if (p.m_Transform != null)
                restLen = Vec3.distance(p0.m_Transform.worldPosition, p.m_Transform.worldPosition);
            else
                restLen = Vec3.transformQuat(new Vec3(), p.m_EndOffset, p0.m_Transform.worldRotation).length();

            // keep shape
            let stiffness = math.lerp(1.0, p.m_Stiffness, m_Weight);
            if (stiffness > 0 || p.m_Elasticity > 0) {
                const m0 = Mat4.copy(new Mat4(), p0.m_Transform.worldMatrix) as Mat4;
                m0.m12 = p0.m_Position.x; m0.m13 = p0.m_Position.y; m0.m14 = p0.m_Position.z;
                const restPos = new Vec3();
                if (p.m_Transform != null)
                    Vec3.transformMat4(restPos, p.m_Transform.position, m0);
                else
                    Vec3.transformMat4(restPos, p.m_EndOffset, m0);

                const d = Vec3.subtract(new Vec3(), restPos, p.m_Position);
                Vec3.scaleAndAdd(p.m_Position, p.m_Position, d, p.m_Elasticity);

                if (stiffness > 0) {
                    Vec3.subtract(d, restPos, p.m_Position);
                    const len = d.length();
                    const maxlen = restLen * (1 - stiffness) * 2;
                    if (len > maxlen)
                        Vec3.scaleAndAdd(p.m_Position, p.m_Position, d, (len - maxlen) / len);
                }
            }

            // collide
            const m_Colliders = this.m_Colliders;
            if (m_Colliders != null) {
                const particleRadius = p.m_Radius * this.m_ObjectScale;
                for (let j = 0; j < m_Colliders.length; ++j) {
                    const c = m_Colliders[j];
                    if (c != null && c.enabled) {
                        const sd = Vec3.squaredDistance(c.node.worldPosition, p.m_Position);
                        const d2 = particleRadius + c.radius;
                        const sd2 = d2 * d2;
                        if (sd < sd2) {
                            const nd = Vec3.subtract(new Vec3(), p.m_Position, c.node.worldPosition);
                            nd.normalize();
                            Vec3.scaleAndAdd(p.m_Position, c.node.worldPosition, nd, d2);
                        }
                    }
                }
            }

            // freeze axis, project to plane 
            if (m_FreezeAxis != EFreezeAxis.None) {
                switch (m_FreezeAxis) {
                    case EFreezeAxis.X:
                        const right = Vec3.transformQuat(new Vec3(), Vec3.RIGHT, p0.m_Transform.worldRotation)
                        geometry.Plane.fromNormalAndPoint(movePlane, right, p0.m_Position);
                        break;
                    case EFreezeAxis.Y:
                        const up = Vec3.transformQuat(new Vec3(), Vec3.UP, p0.m_Transform.worldRotation)
                        geometry.Plane.fromNormalAndPoint(movePlane, up, p0.m_Position);
                        break;
                    case EFreezeAxis.Z:
                        const forward = Vec3.transformQuat(new Vec3(), Vec3.FORWARD, p0.m_Transform.worldRotation)
                        geometry.Plane.fromNormalAndPoint(movePlane, forward, p0.m_Position);
                        break;
                }
                const tmp = Vec3.dot(p.m_Position, movePlane.n) - movePlane.d;
                Vec3.scaleAndAdd(p.m_Position, p.m_Position, movePlane.n, -tmp);
            }

            // keep length
            const dd = Vec3.subtract(new Vec3(), p0.m_Position, p.m_Position);
            const leng = dd.length();
            if (leng > 0)
                Vec3.scaleAndAdd(p.m_Position, p.m_Position, dd, (leng - restLen) / leng);
        }
    }

    // only update stiffness and keep bone length
    SkipUpdateParticles () {
        const m_Weight = this.m_Weight;
        const m_Particles = this.m_Particles;
        const m_ObjectMove = this.m_ObjectMove;
        for (let i = 0; i < m_Particles.length; ++i) {
            const p = m_Particles[i];
            if (p.m_ParentIndex >= 0) {
                Vec3.add(p.m_Position, p.m_Position, m_ObjectMove);
                Vec3.add(p.m_PrevPosition, p.m_PrevPosition, m_ObjectMove);

                const p0 = m_Particles[p.m_ParentIndex];

                let restLen;
                if (p.m_Transform != null)
                    restLen = Vec3.distance(p0.m_Transform.worldPosition, p.m_Transform.worldPosition);
                else
                    restLen = Vec3.transformQuat(new Vec3(), p.m_EndOffset, p0.m_Transform.worldRotation).length();

                // keep shape
                let stiffness = math.lerp(1.0, p.m_Stiffness, m_Weight);
                if (stiffness > 0) {
                    const m0 = Mat4.copy(new Mat4(), p0.m_Transform.worldMatrix) as Mat4;
                    m0.m12 = p0.m_Position.x; m0.m13 = p0.m_Position.y; m0.m14 = p0.m_Position.z;
                    const restPos = new Vec3();
                    if (p.m_Transform != null)
                        Vec3.transformMat4(restPos, p.m_Transform.position, m0);
                    else
                        Vec3.transformMat4(restPos, p.m_EndOffset, m0);

                    const d = Vec3.subtract(new Vec3(), restPos, p.m_Position);
                    let len = d.length();
                    let maxlen = restLen * (1 - stiffness) * 2;
                    if (len > maxlen)
                        Vec3.scaleAndAdd(p.m_Position, p.m_Position, d, (len - maxlen) / len);
                }

                // keep length
                const dd = Vec3.subtract(new Vec3(), p0.m_Position, p.m_Position);
                const leng = dd.length();
                if (leng > 0)
                    Vec3.scaleAndAdd(p.m_Position, p.m_Position, dd, (leng - restLen) / leng);
            }
            else {
                Vec3.copy(p.m_PrevPosition, p.m_Position);
                Vec3.copy(p.m_Position, p.m_Transform.position);
            }
        }
    }

    ApplyParticlesToTransforms () {
        const m_Particles = this.m_Particles;
        for (let i = 1; i < m_Particles.length; ++i) {
            const p = m_Particles[i];
            const p0 = m_Particles[p.m_ParentIndex];
            if (p0.m_Transform.children.length <= 1) {		// do not modify bone orientation if has more then one child
                const v = new Vec3();
                if (p.m_Transform != null)
                    Vec3.copy(v, p.m_Transform.position);
                else
                    Vec3.copy(v, p.m_EndOffset);
                const v2 = Vec3.subtract(new Vec3(), p.m_Position, p0.m_Position).normalize();
                Vec3.transformQuat(v, v, p0.m_Transform.worldRotation);
                const rot = Quat.rotationTo(new Quat(), v.normalize(), v2);
                Quat.multiply(rot, rot, p0.m_Transform.worldRotation);
                p0.m_Transform.worldRotation = rot;
            }

            if (p.m_Transform != null)
                p.m_Transform.worldPosition = p.m_Position;
        }
    }
}
