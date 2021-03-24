
import { _decorator, Component, Node, Vec3 } from 'cc';
import { LoopMotion } from '../../cases/scripts/LoopMotion';
const { ccclass, property } = _decorator;

@ccclass('SimpleJointTest')
export class SimpleJointTest extends Component {

    _lm: LoopMotion = null!;

    USE_YOYO = true;
    YOYO_FLAG = 1;
    initEluer = new Vec3();

    start () {
        this._lm = this.getComponent(LoopMotion)!;
        if (this._lm) Vec3.copy(this.initEluer, this._lm.node.eulerAngles);
    }

    onBtnRotate () {
        if (this._lm) this._lm.USE_ROTATION = !this._lm.USE_ROTATION;
    }

    onBtnTranslate () {
        if (this._lm) this._lm.USE_TRANSLATE = !this._lm.USE_TRANSLATE;
    }

    onBtnYoyo () {
        this.USE_YOYO = !this.USE_YOYO;
        if (this._lm) this._lm.node.eulerAngles = this.initEluer;
    }

    update () {
        if (this.USE_YOYO) {
            if (this._lm) {
                const n = this._lm.node;
                let needUp = false;
                if (n.eulerAngles.y < -60 && this.YOYO_FLAG != 0) {
                    this.YOYO_FLAG = 0;
                    needUp = true;
                } else if (n.eulerAngles.y > 60 && this.YOYO_FLAG != 1) {
                    this.YOYO_FLAG = 1;
                    needUp = true;
                }
                if (needUp) this._lm.updateDeltaEuler(this._lm.deltaEuler.negative());
            }
        }
    }
}
