import { Quat, Vec3, Node } from "cc";

const THETA_ERROR = 0.001;
const DUMP_BIAS = 1.0;

enum IterationResult {
    UNFINISHED,
    DONE,
    INTERRUPTED,
}

/**
 * The Cyclic Coordinate Descent algorithm.
 * @param links The links(limbs).
 * @param target Target position.
 * @param maxIterations Max iterations.
 * @param forward True if use forward iteration(base to leaf), otherwise use backward iteration(leaf to base).
 */
export function ccdIK (
    links: Node[],
    target: Vec3,
    epsilon: number,
    maxIterations: number,
    forward: boolean,
) {
    if (links.length == 0) return;
    if (links.length == 1) links[0].worldPosition = target;
    // if(links.length == 2)
}