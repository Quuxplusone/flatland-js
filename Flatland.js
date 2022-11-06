var Flatland = {};
(function () {

    Flatland.meters = function (x) { return x; };
    Flatland.metersPerSec = function (x) { return x; };
    Flatland.metersPerS2 = function (x) { return x; };

    Flatland.lerp = function (f, c0, c1) {
        f = Math.min(Math.max(0, f), 1);
        return c0.map((x, i) => x*(1-f) + c1[i]*f);
    };

    Flatland.normalDist = function (mean, sd) {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return (sd * n) + mean;
    }

    Flatland.nearZeroAngle = function (angle) {
        while (angle < -Math.PI) {
            angle += 2 * Math.PI;
        }
        while (angle > Math.PI) {
            angle -= 2 * Math.PI;
        }
        return angle;
    };

    // this is needed to fix floating point errors.
    // I'm using the same fuzzyEquals right now for angles
    // and for lines which could be a problem in the future
    Flatland.fuzzyEquals = function (a, b) {
        return Math.abs(a - b) < 0.00001;
    };
    let fe = Flatland.fuzzyEquals;
    let gtfe = function (a, b) {
        return a > b || fe(a, b);
    };
    let ltfe = function (a, b) {
        return a < b || fe(a, b);
    };

    Flatland.getDistance = function (p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    };

    Flatland.endpointsToMxPlusB = function (p1, p2) {
        let m = (p2.y - p1.y) / (p2.x - p1.x);
        return {
            m: m,
            b: p1.y - (m * p1.x)
        };
    };

    // given a middle point (point), and start and end points,
    // returns true if point is between them (inclusive)
    // and false otherwise
    Flatland.betweenPoints = function (args) {
        let px = Math.min(args.start.x, args.end.x);
        let py = Math.min(args.start.y, args.end.y);
        let q = args.point;
        let rx = Math.max(args.start.x, args.end.x);
        let ry = Math.max(args.start.y, args.end.y);
        return ltfe(px, q.x) && ltfe(q.x, rx) && ltfe(py, q.y) && ltfe(q.y, ry);
    };

    Flatland.polarToMxPlusB = function (origin, angle) {
        return Flatland.endpointsToMxPlusB(origin, {
            x: origin.x + 10 * Math.cos(angle),
            y: origin.y + 10 * Math.sin(angle),
        });
    };

    Flatland.getIntersectionOfRays = function (args) {
        let x1 = args.origin1.x;
        let y1 = args.origin1.y;
        let x2 = args.origin2.x;
        let y2 = args.origin2.y;
        let dx1 = Math.cos(args.angle1);
        let dy1 = Math.sin(args.angle1);
        let dx2 = Math.cos(args.angle2);
        let dy2 = Math.sin(args.angle2);
        // We have
        //     xr = x1 + t1*dx1 = x2 + t2*dx2
        //     yr = y1 + t1*dy1 = y2 + t2*dy2
        //     t1 = (x2-x1)/dx1 + t2*dx2/dx1
        //     t1 = (y2-y1)/dy1 + t2*dy2/dy1
        //      0 = (x2-x1)/dx1 - (y2-y1)/dy1 + t2*(dx2/dx1 - dy2/dy1)
        //     t2 = ((y2-y1)/dy1 - (x2-x1)/dx1) / (dx2/dx1 - dy2/dy1)

        let t2 = ((y2-y1)/dy1 - (x2-x1)/dx1) / (dx2/dx1 - dy2/dy1);
        let t1 = ((y1-y2)/dy2 - (x1-x2)/dx2) / (dx1/dx2 - dy1/dy2);
        let r2 = { x: x2 + t2 * dx2, y: y2 + t2 * dy2 };
        return r2;
    };

    Flatland.getIntersectionWithLineSegment = function (args) {
        let origin = args.point;
        let angle = Flatland.nearZeroAngle(args.angle);
        let start = args.line.start;
        let end = args.line.end;
        let segment = Flatland.endpointsToMxPlusB(start, end);
        let ray = Flatland.polarToMxPlusB(origin, angle);

        let intersection;
        if (start.x === end.x) {
            intersection = { x: start.x, y: ray.m * start.x + ray.b };
        } else if (fe(angle, Math.PI / 2) || fe(angle, -Math.PI / 2)) {
            intersection = { x: origin.x, y: segment.m * origin.x + segment.b };
        } else {
            let x = (ray.b - segment.b) / (segment.m - ray.m);
            intersection = { x: x, y: ray.m * x + ray.b };
        }

        // there will be an intersection in 2 cases:
        // 1. a real intersection
        // 2. an intersection of the shape was turned PI/2 radians around
        // we should only count the real ones
        if (!Flatland.betweenPoints({ point: intersection, start: start, end: end })) {
            return false;
        }
        let angleToIntersection = Flatland.nearZeroAngle(Flatland.getAngleTo(origin, intersection) - args.angle);
        if (Math.abs(angleToIntersection) >= Math.PI / 2) {
            return false;
        }
        return intersection;
    };


    // returns an array of Points that, if we draw lines between
    // them, constitute the Shape
    Flatland.getPoints = function (shape) {
        let c = shape.center;
        let r = shape.radius;
        if (shape.isIsosceles) {
            let d = (2*Math.PI / 3) + shape.degreeOfIrregularity * (Math.PI / 3);
            return [
                {x: c.x + r * Math.cos(shape.angle + 0), y: c.y + r * Math.sin(shape.angle + 0)},
                {x: c.x + r * Math.cos(shape.angle + d), y: c.y + r * Math.sin(shape.angle + d)},
                {x: c.x + r * Math.cos(shape.angle - d), y: c.y + r * Math.sin(shape.angle - d)},
            ];
        } else {
            let points = [];
            for (let i = 0; i < shape.sides; ++i) {
                points.push({
                    x: c.x + r * Math.cos(shape.angle + 2*i*Math.PI / shape.sides),
                    y: c.y + r * Math.sin(shape.angle + 2*i*Math.PI / shape.sides),
                });
            }
            return points;
        }
    };

    Flatland.getLineSegments = function (shape) {
        let points = Flatland.getPoints(shape);
        let lines = [];
        for (let ii = 1; ii < points.length; ++ii) {
            lines.push({
                start: points[ii - 1],
                end: points[ii]
            });
        }
        lines.push({
            start: points[points.length - 1],
            end: points[0]
        });
        return lines;
    };

    Flatland.RandomShape = function (center, dir) {
        // `cam` controls the shape's wiggling or rotating.
        // `cam` is incremented by `camDelta` each time the NPC moves.
        this.cam = 0.0;
        this.dir = dir;
        this.speed = Flatland.normalDist(1, 0.2) * Flatland.metersPerSec(1);
        this.center = center;
        this.radius = Flatland.normalDist(1, 0.2) * Flatland.meters(20);
        this.angle = dir;
        let t = Math.random();
        if (t < 0.2) {
            this.isIsosceles = true;
            this.sides = 3;
            this.degreeOfIrregularity = Flatland.normalDist(0.5, 0.2);
            this.camDelta = (Math.PI / 8) * Flatland.normalDist(1, 0.1);
        } else {
            this.isIsosceles = false;
            this.sides = t < 0.33 ? 3 :  // 33% triangles
                         t < 0.58 ? 4 :  // 25% squares
                         t < 0.76 ? 5 :  // 18% pentagons
                         t < 0.86 ? 6 :  // 10% hexagons
                         t < 0.89 ? 7 :  // 3% heptagons
                         t < 0.94 ? 8 :  // 5% octagons
                         Math.floor(9 + 1.0 / (Math.random() + 0.1));
            this.camDelta = (Math.random() - 0.5) * (Math.PI / 10);
        }
        let colors = [
            [255, 160, 122],
            [255, 218, 185],
            [255, 228, 181],
            [255, 239, 213],
            [139,  69,  19],
            [160,  82,  45],
            [210, 105,  30],
            [244, 164,  96],
            [222, 184, 135],
            [245, 222, 179],
            [255, 222, 173],
            [255, 228, 196],
            [255, 235, 205],
            [250, 235, 215],
            [250, 240, 230],
            [255, 245, 238]
        ];
        let i = Math.floor(Math.random() * colors.length);
        let j = Math.floor(Math.random() * colors.length);
        this.color = Flatland.lerp(Math.random(), colors[i], colors[j]);
        this.specularFactor = Math.max(0.1, this.isIsoceles ? Flatland.normalDist(0.5, 0.1) : Flatland.normalDist(1, 0.1));
        this.identified = false;
    };

    Flatland.RandomShape.prototype.moveNPC = function (npcs) {
        this.cam += this.camDelta;
        if (this.isIsosceles) {
            this.angle = this.dir + Math.sin(this.cam) * (Math.PI / 20);
        } else {
            this.angle = this.cam;
        }
        this.center.x += this.speed * Math.cos(this.dir);
        this.center.y += this.speed * Math.sin(this.dir);

        // Deflect if I'm on a collision course with someone.
        let myTrajectory = Flatland.polarToMxPlusB(this.center, this.dir);
        for (let i = 0; i < npcs.length; ++i) {
            if (npcs[i] == this) {
                // do nothing
            } else if (Flatland.getDistance(this.center, npcs[i].center) < this.radius + npcs[i].radius + Flatland.meters(1)) {
                this.dir = Flatland.getAngleTo(npcs[i].center, this.center);
            } else {
                let trajectory2 = Flatland.polarToMxPlusB(npcs[i].center, npcs[i].dir);
                let p1 = Flatland.getIntersectionOfRays({
                    origin1: npcs[i].center,
                    angle1: npcs[i].dir,
                    origin2: this.center,
                    angle2: this.dir
                });
                let t1 = Flatland.getDistance(this.center, p1) / this.speed;
                if (0 < t1 && t1 < Infinity) {
                    let p2 = {
                        x: npcs[i].center.x + t1 * Math.cos(npcs[i].speed),
                        y: npcs[i].center.y + t1 * Math.sin(npcs[i].speed)
                    };
                    if (Flatland.getDistance(p1, p2) < this.radius + npcs[i].radius + Flatland.meters(2)) {
                        this.dir += Math.PI / 20;
                        this.speed += ((this.speed > npcs[i].speed) ? -1 : +1) * Flatland.metersPerS2(0.01);
                    }
                }
            }
        }
    };

    Flatland.getAngleTo = function (p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    };

    Flatland.getNormal = function (line) {
        return Flatland.getAngleTo(line.start, line.end) - (Math.PI / 2);
    };

    Flatland.castRay = function (args) {
        let origin = args.origin;
        let angle = args.angle;
        let shapes = args.shapes;
        let result = { origin: origin, angle: angle, distance: Infinity };

        result.endpoint = {
            x: origin.x + Flatland.meters(500) * Math.cos(angle),
            y: origin.y + Flatland.meters(500) * Math.sin(angle)
        };

        for (let shape of shapes) {
            for (let line of Flatland.getLineSegments(shape)) {
                let p = Flatland.getIntersectionWithLineSegment({
                    point: origin,
                    angle: angle,
                    line: line
                });
                if (p !== false) {
                    let d = Flatland.getDistance(origin, p);
                    if (d < result.distance) {
                        result = { origin: origin, angle: angle, distance: d, shape: shape, normal: Flatland.getNormal(line) };
                        result.endpoint = p;
                    }
                }
            }
        }
        return result;
    };

}());
