import { Enum } from "cc";

export enum EIntegrateMethod {
    // 一阶
    Euler_Forward,
    Euler_Backward,
    Euler_Trapezoid,
    // 二阶
    Verlet_Classic,
    Verlet_Leapfrog,
    Verlet_Velocity,
}
Enum(EIntegrateMethod);
