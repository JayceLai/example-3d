
import { _decorator, Component, Node, Prefab, loader, instantiate, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('StairsGenerator')
export class StairsGenerator extends Component {

    @property
    count = 10;

    @property(Prefab)
    prefab: Prefab | null = null;

    @property
    get generate () {
        this.node.destroyAllChildren();
        if (this.node.children.length == 0 && this.prefab) {
            // this.generator(this.prefab);
        }
        return false;
    }
    set generate (v) { }


    static readonly url = 'common/prefabs/Ladder';

    private static _flag = 0;
    private static _ladder: Prefab | null = null;
    private static _onloaded: Function[] = [];

    __preload () {
        const that = StairsGenerator;
        if (that._ladder === null && !(that._flag & 1)) {
            that._flag |= 1 << 0;
            loader.loadRes(that.url, Prefab, (...args) => {
                if (args) {
                    if (args[0]) {
                        console.error(args[0]);
                    } else {
                        that._ladder = args[1] as Prefab;
                        if (that._onloaded) {
                            that._onloaded.forEach(element => {
                                element(that._ladder);
                            });;
                            that._onloaded.length = 0;
                        }
                    }
                }
            });
        }
    }

    start () {
        if (this.node.children.length == 0) {
            if (StairsGenerator._ladder) {
                this.generator(StairsGenerator._ladder);
            } else {
                StairsGenerator._onloaded.push(this.generator.bind(this));
            }
        }
    }

    generator (prefab: Prefab) {
        const s = (prefab.data as Node).scale;
        for (let i = 0; i < this.count; i++) {
            const pt = instantiate(prefab);
            this.node.addChild(pt);
            const index = (i + 1);
            pt.position = new Vec3(0, s.y / 2 * (index + i), s.z / 2 * (index + i));
        }
    }
}
