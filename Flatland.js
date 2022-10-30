var Flatland = {};
(function () {

    Flatland.lerp = function (f, c0, c1) {
        f = Math.min(Math.max(0, f), 1);
        return c0.map((x, i) => x*(1-f) + c1[i]*f);
    };

    Flatland.normalDist = function (mean, sd) {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        let n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return (sd * n) + mean;
    }

    Flatland.formatAngle = function (angle) {
        while (angle < 0) {
            angle += 2 * Math.PI;
        }
        while (angle >= 2 * Math.PI) {
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

    Flatland.LineSegment = function (args) {
        this.start = args.start;
        this.end = args.end;
    };

    // draws to the given context
    Flatland.LineSegment.prototype.draw = function (ctx) {
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.closePath();
        ctx.stroke();
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

    // given a line
    // a point and an angle,
    // returns the point of intersection or false if there is none
    Flatland.getIntersectionWithLineSegment = function (args) {
        let origin = args.point;
        let angle = Flatland.formatAngle(args.angle);
        let start = args.line.start;
        let end = args.line.end;
        let segment = Flatland.endpointsToMxPlusB(start, end);
        let ray = Flatland.polarToMxPlusB(origin, angle);

        let intersection;
        if (start.x === end.x) {
            intersection = { x: start.x, y: ray.m * start.x + ray.b };
        } else if (fe(angle, Math.PI / 2) || fe(angle, 3 * Math.PI / 2)) {
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
        let angleToIntersection = Math.atan2(intersection.y - origin.y, intersection.x - origin.x) - args.angle;
        while (angleToIntersection > Math.PI) {
            angleToIntersection -= 2 * Math.PI;
        }
        while (angleToIntersection < -Math.PI) {
            angleToIntersection += 2 * Math.PI;
        }
        if (Math.abs(angleToIntersection) >= Math.PI / 2) {
            return false;
        }
        return intersection;
    };

    // Flatland.Shape: a regular polygon
    // given a center (Point), radius (Number), and number of sides (Number)
    // creates the corresponding regular polygon
    Flatland.Shape = function (args) {
        this.center = args.center;
        this.radius = args.radius;
        this.angle = args.angle;
        this.sides = args.sides;
    };

    // returns an array of Points that, if we draw lines between
    // them, constitute the Shape
    Flatland.Shape.prototype.getPoints = function () {
        let points = [];
        let increment = Math.PI - (Math.PI * (this.sides - 2) / this.sides);
        for (let a = 0; a < 2 * Math.PI; a += increment) {
            points.push({
                x: this.center.x + this.radius * Math.cos(this.angle + a),
                y: this.center.y + this.radius * Math.sin(this.angle + a),
            });
        }
        return points;
    };

    Flatland.Shape.prototype.getLineSegments = function () {
        let points = this.getPoints();
        let lines = [];
        for (let ii = 1; ii < points.length; ++ii) {
            lines.push(new Flatland.LineSegment({
                start: points[ii - 1],
                end: points[ii]
            }));
        }
        lines.push(new Flatland.LineSegment({
            start: points[points.length - 1],
            end: points[0]
        }));
        return lines;
    };

    // draw shape to the given context
    Flatland.Shape.prototype.draw = function (cheatCtx) {
        for (let line of this.getLineSegments()) {
            line.draw(cheatCtx);
        }
    };

    // To make drawing shapes easier, the context is divided up into a grid
    // each square in the grid is a Flatland.Grid.
    // grid.resident is the shape occupying the grid
    // grid.busy is true if a shape is moving into or out of the square
    Flatland.Grid = function (args) {
        this.center = args.center;
        this.length = args.length;
        this.resident = false;
        this.busy = false;
    };

    // Subclass (or whatever the prototypical version is called) of Shape,
    // a random regular polygon
    // it can have 3-8 sides and spin clockwise or counter-clockwise
    Flatland.RandomShape = function (grid) {
        this.grid = grid;
        this.spin = (Math.random() * Math.PI / 10) - Math.PI / 20;
        this.speed = 1;
        this.prev_grid = null;
        this.center = { x: grid.center.x, y: grid.center.y };
        this.radius = 20 * Flatland.normalDist(1, 0.2);
        this.angle = Math.random() * Math.PI;
        this.sides = Math.random() < 0.33 ? 3 :  // 33% triangles
                     Math.random() < 0.58 ? 4 :  // 25% squares
                     Math.random() < 0.76 ? 5 :  // 18% pentagons
                     Math.random() < 0.86 ? 6 :  // 10% hexagons
                     Math.random() < 0.89 ? 7 :  // 3% heptagons
                     Math.random() < 0.94 ? 8 :  // 5% octagons
                     Math.floor(9 + 1.0 / (Math.random() + 0.1));
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
    };

    Flatland.RandomShape.prototype = new Flatland.Shape({});

    Flatland.RandomShape.prototype.moveNPC = function () {
        this.angle = Flatland.formatAngle(this.angle + this.spin);
        if (Math.abs(this.center.x - this.grid.center.x) < 1) {
            this.center.x = this.grid.center.x;
        } else if (this.center.x > this.grid.center.x) {
            this.center.x -= this.speed;
        } else if (this.center.x < this.grid.center.x) {
            this.center.x += this.speed;
        }

        if (Math.abs(this.center.y - this.grid.center.y) < 1) {
            this.center.y = this.grid.center.y;
        } else if (this.center.y > this.grid.center.y) {
            this.center.y -= this.speed;
        } else if (this.center.y < this.grid.center.y) {
            this.center.y += this.speed;
        }

        if (this.grid.center.x === this.center.x && this.grid.center.y === this.center.y) {
            this.grid.busy = false;
            if (this.prev_grid) {
                this.prev_grid.busy = false;
            }
        }
    };

    Flatland.getNormal = function (line) {
        return Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x) - (Math.PI / 2);
    };

    // Given a point and an angle
    // a list of the lines bordering the context,
    // the drawing context,
    // and a list of shapes floating around,
    // draws a line on the context to the closest intersection.
    // Also returns the closest intersection.
    Flatland.getAndDrawRay = function (args) {
        let origin = args.origin;
        let angle = args.angle;
        let shapes = args.shapes;
        let borders = args.borders;
        let cheatCtx = args.context;
        let result = { distance: Infinity, angle: angle };
        let endpoint = null;

        for (let ii = 0; ii < borders.length; ii += 1) {
            let p = Flatland.getIntersectionWithLineSegment({
                point: origin,
                angle: angle,
                line: borders[ii]
            });
            if (p !== false) {
                endpoint = p;
            }
        }
        for (let ii = 0; ii < shapes.length; ii += 1) {
            let lines = shapes[ii].getLineSegments();
            for (let jj = 0; jj < lines.length; jj += 1) {
                let p = Flatland.getIntersectionWithLineSegment({
                    point: origin,
                    angle: angle,
                    line: lines[jj]
                });
                if (p !== false) {
                    let d = Flatland.getDistance(origin, p);
                    if (d < result.distance) {
                        result = { distance: d, angle: angle, normal: Flatland.getNormal(lines[jj]), shape: shapes[ii] };
                        endpoint = p;
                    }
                }
            }
        }

        let line = new Flatland.LineSegment({
            start: origin,
            end: endpoint
        });
        line.draw(cheatCtx);
        return result;
    };

}());
