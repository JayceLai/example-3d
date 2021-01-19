import { _decorator, Component, Node, LabelComponent, SpriteComponent, Enum, physics, PhysicsSystem } from "cc";
const { ccclass, property, menu } = _decorator;

enum EPhysicsItem {
    BUILTIN = 1 << 0,
    CANNON = 1 << 1,
    AMMO = 1 << 2,
    PHYSX = 1 << 3,
    BUILTIN_AMMO = EPhysicsItem.BUILTIN + EPhysicsItem.AMMO,
    CANNON_AMMO = EPhysicsItem.CANNON + EPhysicsItem.AMMO,
    AMMO_PHYSX = EPhysicsItem.AMMO + EPhysicsItem.PHYSX,
    CANNON_AMMO_PHYSX = EPhysicsItem.CANNON + EPhysicsItem.AMMO + EPhysicsItem.PHYSX,
    ALL = -1,
}
Enum(EPhysicsItem);

@ccclass("CHECKS.PhysicsEnvCheck")
@menu("misc/checks/PhysicsEnvCheck")
export class PhysicsEnvCheck extends Component {

    // @property({ type: EPhysicsItem })
    physics: EPhysicsItem = EPhysicsItem.CANNON_AMMO;

    onLoad () {
        // Your initialization goes here.
        let label = this.node.getChildByName('desc')!.getComponent(LabelComponent);
        if (label) {
            if (physics.selector.id) {
                label.string = physics.selector.id;
            } else {
                label.string = "unknown";
            }
        }

        const name = this.node.name.toUpperCase().replace('-', '_');
        this.physics = (EPhysicsItem as any)[name];

        // hack
        if (PhysicsSystem.PHYSICS_PHYSX) return;

        const lbCom = this.node.getChildByName('lb')!.getComponent(LabelComponent)!;
        const sprCom = this.getComponentInChildren(SpriteComponent)!;
        switch (this.physics) {
            case EPhysicsItem.ALL:
                break;
            case EPhysicsItem.AMMO_PHYSX:
                if (PhysicsSystem.PHYSICS_PHYSX || PhysicsSystem.PHYSICS_AMMO) break;

                lbCom.enabled = true; sprCom.enabled = true;
                lbCom.string = "测试此场景需要将物理模块设置为 ammo.js 或 physx";
                break;

            case EPhysicsItem.CANNON_AMMO:
                if (PhysicsSystem.PHYSICS_CANNON || PhysicsSystem.PHYSICS_AMMO) break;

                lbCom.enabled = true; sprCom.enabled = true;
                lbCom.string = "测试此场景需要将物理模块设置为 cannon.js 或 ammo.js";
                break;

            case EPhysicsItem.BUILTIN_AMMO:
                if (PhysicsSystem.PHYSICS_BUILTIN || PhysicsSystem.PHYSICS_AMMO) break;

                lbCom.enabled = true; sprCom.enabled = true;
                lbCom.string = "测试此场景需要将物理模块设置为 builtin 或 ammo.js";
                break;

            case EPhysicsItem.CANNON:
                if (!PhysicsSystem.PHYSICS_CANNON) {
                    lbCom.enabled = true; sprCom.enabled = true;
                    lbCom.string = "测试此场景需要将物理模块设置为 cannon.js";
                }
                break;
            case EPhysicsItem.AMMO:
                if (!PhysicsSystem.PHYSICS_AMMO) {
                    lbCom.enabled = true; sprCom.enabled = true;
                    lbCom.string = "测试此场景需要将物理模块设置为 ammo.js";
                }
                break;
            case EPhysicsItem.BUILTIN:
                if (!PhysicsSystem.PHYSICS_BUILTIN) {
                    lbCom.enabled = true; sprCom.enabled = true;
                    lbCom.string = "测试此场景需要将物理模块设置为 builtin";
                }
                break;
        }
    }
}
