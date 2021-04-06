
import { _decorator, Component, Node, RigidBody, HingeConstraint, physics, Vec3, PointToPointConstraint } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SetupChain')
export class SetupChain extends Component {
    @property
    axis = new Vec3();
    @property
    rootAxis = new Vec3();
    start () {
        let cur = this.node;
        const rig = cur.addComponent(RigidBody);
        rig.type = physics.ERigidBodyType.KINEMATIC;
        if (cur.children.length > 0) {
            cur = cur.children[0];
            const hinge = cur.addComponent(HingeConstraint);
            hinge.connectedBody = rig; // TODO....
            hinge.axis = this.rootAxis;
            hinge.pivotB = cur.position;
        }
        let i = 0;
        while (cur.children.length > 0) {
            i++;
            cur = cur.children[0];
            if (cur.children.length > 0) {
                const hinge = cur.addComponent(HingeConstraint);
                hinge.connectedBody = cur.parent!.getComponent(RigidBody)!;
                hinge.pivotB = cur.position;
                hinge.axis = this.axis;
                if (i == 3) cur.getComponent(RigidBody)!.mass = 5;
            } else {
                const p2p = cur.addComponent(PointToPointConstraint);
                p2p.connectedBody = cur.parent!.getComponent(RigidBody)!;
                p2p.pivotB = cur.position;
                cur.getComponent(RigidBody)!.mass = 15;
            }
        }
    }
}
