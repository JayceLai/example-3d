
import { _decorator, Component, Node, Vec3, Quat, director, Director } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('TwoBonesSolver')
@executeInEditMode
export class TwoBonesSolver extends Component {

    @property(Node)
    bone0: Node = null!;

    @property(Node)
    bone1: Node = null!;

    @property(Node)
    bone2: Node = null!;

    @property(Node)
    end: Node = null!;

    _joints: Node[] = [];

    start() {
        this._joints.push(this.bone0, this.bone1, this.bone2);
    }

    onEnable() {
        director.on(Director.EVENT_BEFORE_DRAW, this.preDraw, this);
    }

    onDisable() {
        director.off(Director.EVENT_BEFORE_DRAW, this.preDraw, this);
    }

    preDraw() {
        if (this.end && !this._joints.find((v) => { return !v; }))
            IK(this._joints, this.end);
    }
}

function IK(J: Node[], end: Node) {
    const L = [
        Vec3.distance(J[0].worldPosition, J[1].worldPosition),
        Vec3.distance(J[1].worldPosition, J[2].worldPosition),
        Vec3.distance(J[0].worldPosition, end.worldPosition),
    ];
    const DirN = Vec3.subtract(new Vec3(), end.worldPosition, J[0].worldPosition).normalize();
    if (Math.abs(L[0] - L[1]) >= L[2] || L[0] + L[1] <= L[2]) {
        const forward = Vec3.subtract(new Vec3(), J[1].worldPosition, J[0].worldPosition).normalize();
        const rot = Quat.rotationTo(new Quat(), forward, DirN);
        J[0].rotate(rot, Node.NodeSpace.WORLD);
        Vec3.subtract(forward, J[2].worldPosition, J[1].worldPosition).normalize();
        Quat.rotationTo(rot, forward, DirN);
        J[1].rotate(rot, Node.NodeSpace.WORLD);
    } else {
        const LDir = L[2];
        const JV0 = Vec3.subtract(new Vec3(), J[1].worldPosition, J[0].worldPosition);
        const JV1 = Vec3.subtract(new Vec3(), J[2].worldPosition, J[1].worldPosition);
        const L0LenSqr = JV0.lengthSqr(), L1LenSqr = JV1.lengthSqr();
        const L0Len = Math.sqrt(L0LenSqr), L1Len = Math.sqrt(L1LenSqr);
        const LDirSqr = LDir * LDir;
        const from1 = Math.acos(Vec3.dot(JV0, DirN) / L0Len);
        const from2 = Math.acos(Vec3.dot(JV1, JV0) / (L0Len * L1Len));
        let to = Math.acos((L0LenSqr + LDirSqr - L1LenSqr) / (2 * L0Len * LDir));
        let rad = from1 - to;
        const axis = Vec3.cross(new Vec3(), JV0, DirN).normalize();
        const rot = Quat.fromAxisAngle(new Quat(), axis, rad);
        J[0].rotate(rot, Node.NodeSpace.WORLD);

        to = Math.acos((-L0LenSqr - L1LenSqr + LDirSqr) / (2 * L0Len * L1Len));
        rad = from2 - to;
        Vec3.cross(axis, JV1, DirN).normalize();
        Quat.fromAxisAngle(rot, axis, rad);
        J[1].rotate(rot, Node.NodeSpace.WORLD);

        Vec3.subtract(JV1, J[2].worldPosition, J[1].worldPosition).normalize();
        const toVec = Vec3.subtract(new Vec3, end.worldPosition, J[1].worldPosition).normalize();
        Quat.rotationTo(rot, JV1, toVec);
        J[1].rotate(rot, Node.NodeSpace.WORLD);
    }
}
