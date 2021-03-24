import { Vec3 } from "cc";

interface Range {
    min: number;
    max: number;
}

interface Convex {
    positions: Vec3[];
    faces: number[];
    axis: Vec3[];
}

export class SAT {
    projection (normal: Vec3, positions: Vec3[]): Range | undefined {
        if (positions.length == 0) return;
        let min = normal.dot(positions[0]);
        let max = min;
        for (let i = 1; i < positions.length; i++) {
            const p = normal.dot(positions[i]);
            max = max > p ? max : p;
            min = min > p ? p : min;
        }
        return { min, max }
    }

    overlap2Convex (a: Convex, b: Convex): boolean {
        if (a.positions.length == 0 || b.positions.length == 0) return false;
        for (let i = 0; i < a.axis.length; i++) {
            const axis = a.axis[i];
            const rangeA = this.projection(axis, a.positions)!;
            const rangeB = this.projection(axis, b.positions)!;
            const overlap = this.overlap2Range(rangeA, rangeB);
            if (!overlap) return false;
        }
        return true;
    }

    overlap2Range (a: Range, b: Range) {
        return (a.max < b.min || b.max < a.min) ? false : true;
    }
}
