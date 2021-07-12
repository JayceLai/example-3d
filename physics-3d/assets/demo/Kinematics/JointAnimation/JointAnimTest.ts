
import { _decorator, Component, Node, Vec3, Quat, Mat3, math } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('JointAnimTest')
@executeInEditMode
export class JointAnimTest extends Component {

    @property(Node)
    endEffctor: Node = null!;

    @property
    forward = false;

    @property
    epsilon = 1e-7;

    @property
    maxIterations = 20;

    joints: Node[] = [];

    onLoad () {
        let current = this.node;
        while (current.children.length > 0) {
            this.joints.push(current)
            current = current.children[0];
        };
        this.joints.push(current);
    }

    start () {
        IK(this.joints, this.endEffctor);
    }

    update () {
        IK(this.joints, this.endEffctor);
    }
}

function IK (jointRoot: Node | Node[], end: Node) {
    const joints: Node[] = jointRoot instanceof Array ? jointRoot : [];
    if (jointRoot instanceof Node) {
        let current = jointRoot;
        while (current.children.length > 0) {
            joints.push(current)
            current = current.children[0];
        };
        joints.push(current)
    }
    const len = joints.length - 1;
    if (len <= 0) return;

    const DirN = Vec3.subtract(new Vec3(), end.worldPosition, joints[0].worldPosition).normalize();
    if (len == 1) {
        // joints[0].lookAt(end.worldPosition);
        const orientation = Mat3.fromQuat(new Mat3(), joints[0].worldRotation);
        const forward = new Vec3(-orientation.m06, -orientation.m07, -orientation.m08);
        const rot = Quat.rotationTo(new Quat(), forward, DirN);
        joints[0].rotate(rot, Node.NodeSpace.WORLD);
    } else if (len == 2) {
        const L = [
            Vec3.distance(joints[0].worldPosition, joints[1].worldPosition),
            Vec3.distance(joints[1].worldPosition, joints[2].worldPosition),
            Vec3.distance(joints[0].worldPosition, end.worldPosition),
        ];
        if (Math.abs(L[0] - L[1]) >= L[2] || L[0] + L[1] <= L[2]) {
            const forward = Vec3.subtract(new Vec3(), joints[1].worldPosition, joints[0].worldPosition).normalize();
            const rot = Quat.rotationTo(new Quat(), forward, DirN);
            joints[0].rotate(rot, Node.NodeSpace.WORLD);
            Vec3.subtract(forward, joints[2].worldPosition, joints[1].worldPosition).normalize();
            Quat.rotationTo(rot, forward, DirN);
            joints[1].rotate(rot, Node.NodeSpace.WORLD);
        } else {
            const LDir = L[2];
            const L0 = Vec3.subtract(new Vec3(), joints[1].worldPosition, joints[0].worldPosition);
            const L1 = Vec3.subtract(new Vec3(), joints[2].worldPosition, joints[1].worldPosition);
            const L0LenSqr = L0.lengthSqr();
            const L1LenSqr = L1.lengthSqr();
            const LDirSqr = LDir * LDir;
            const L0Len = Math.sqrt(L0LenSqr);
            const L1Len = Math.sqrt(L1LenSqr);
            const from1 = Math.acos(Vec3.dot(L0, DirN) / L0Len);
            const from2 = Math.acos(Vec3.dot(L1, L0) / (L0Len * L1Len));
            let to = Math.acos((L0LenSqr + LDirSqr - L1LenSqr) / (2 * L0Len * LDir));
            // let rad = Math.abs(from1 - to);
            let rad = from1 - to;
            const axis = Vec3.cross(new Vec3(), L0, DirN).normalize();
            const rot = Quat.fromAxisAngle(new Quat(), axis, rad);
            joints[0].rotate(rot, Node.NodeSpace.WORLD);

            to = Math.acos((-L0LenSqr - L1LenSqr + LDirSqr) / (2 * L0Len * L1Len));
            // rad = Math.abs(from2 - to);
            rad = from2 - to;
            Vec3.cross(axis, L1, DirN).normalize();
            Quat.fromAxisAngle(rot, axis, rad);
            joints[1].rotate(rot, Node.NodeSpace.WORLD);

            Vec3.subtract(L1, joints[2].worldPosition, joints[1].worldPosition).normalize();
            const toVec = Vec3.subtract(new Vec3, end.worldPosition, joints[1].worldPosition).normalize();
            Quat.rotationTo(rot, L1, toVec);
            joints[1].rotate(rot, Node.NodeSpace.WORLD);
        }
    }
}
