var Flatland;
Flatland = Flatland || {};

(function () {
    'use strict';

    var fe, ltfe, gtfe;

    // convert the angle so it's always between 0 and 2PI
    Flatland.formatAngle = function (angle) {
        if (angle < 0) {
            return Math.PI * 2 + angle;
        }
        if (angle >= Math.PI * 2) {
            return angle - Math.PI * 2;
        }
        return angle;
    };

    // this is needed to fix floating point errors.
    // I'm using the same fuzzyEquals right now for angles
    // and for lines which could be a problem in the future
    Flatland.fuzzyEquals = function (a, b) {
        return Math.abs(a - b) < 0.00001;
    };
    fe = Flatland.fuzzyEquals;
    gtfe = function (a, b) {
        return a > b || fe(a, b);
    };
    ltfe = function (a, b) {
        return a < b || fe(a, b);
    };

    Flatland.getDistance = function (p1, p2) {
        return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    };

    Flatland.getMxPlusB = function (p1, p2) {
        let m = (p2.y - p1.y) / (p2.x - p1.x);
        return {
            m: m,
            b: p1.y - (m * p1.x)
        };
    };

    Flatland.LineSegment = function (args) {
        let that = this;
        that.start = args.start;
        that.end = args.end;
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

    // given a line
    // a point and an angle,
    // returns the point of intersection or false if there is none
    Flatland.getIntersectionWithLineSegment = function (args) {
        let origin = args.point;
        let angle = Flatland.formatAngle(args.angle);
        let start = args.line.start;
        let end = args.line.end;
        let segment = Flatland.getMxPlusB(start, end);
        let ray = Flatland.getMxPlusB(origin, new Flatland.Point({
            x: origin.x + 10 * Math.cos(angle),
            y: origin.y + 10 * Math.sin(angle),
        }));

        let intersection;
        if (start.x === end.x) {
            intersection = new Flatland.Point({ x: start.x, y: ray.m * start.x + ray.b });
        } else if (fe(angle, Math.PI / 2) || fe(angle, 3 * Math.PI / 2)) {
            intersection = new Flatland.Point({ x: origin.x, y: segment.m * origin.x + segment.b });
        } else {
            let x = (ray.b - segment.b) / (segment.m - ray.m);
            intersection = new Flatland.Point({ x: x, y: ray.m * x + ray.b });
        }

        // there will be an intersection in 2 cases:
        // 1. a real intersection
        // 2. an intersection of the shape was turned PI/2 radians around
        // we should only count the real ones
        if (!Flatland.betweenPoints({ point: intersection, start: start, end: end })) {
            return false;
        }
        if (angle >= 0 && angle < Math.PI && intersection.y < origin.y) { // bottom
            return false;
        }
        if (angle >= Math.PI && angle < 2 * Math.PI && intersection.y > origin.y) { // top
            return false;
        }
        if (((angle >= 0 && angle < Math.PI / 2) || (angle >= 3 * Math.PI / 2 && angle < 2 * Math.PI)) && intersection.x < origin.x) { // right
            return false;
        }
        if (angle >= Math.PI / 2 && angle < 3 * Math.PI / 2 && intersection.x > origin.x) { // top
            return false;
        }
        return intersection;
    };

    Flatland.Point = function (args) {
        var that = this;

        that.x = args.x;
        that.y = args.y;
    };

    // Flatland.Shape: a regular polygon
    // given a center (Point), radius (Number), and number of sides (Number)
    // creates the corresponding regular polygon
    Flatland.Shape = function (args) {
        var that = this;

        that.center = args.center;
        that.radius = args.radius;
        that.angle = args.angle;
        that.sides = args.sides;
        that.increment = Math.PI - ((that.sides - 2) * Math.PI / that.sides);
    };

    // returns an array of Points that, if we draw lines between
    // them, constitute the triangle
    Flatland.Shape.prototype.getPoints = function () {
        var that = this,
            points = [],
            angle = that.angle,
            original = angle;

        while (angle < original + Math.PI * 2) {
            points.push(new Flatland.Point({
                x: that.center.x + that.radius * Math.cos(angle),
                y: that.center.y + that.radius * Math.sin(angle),
            }));

            angle += that.increment;
        }
        return points;
    };

    // similar to getPoints above, except returns LineSegents
    // instead of Points
    Flatland.Shape.prototype.getLineSegments = function () {
        var that = this,
            points = that.getPoints(),
            lines = [];

        for (let ii = 1; ii < points.length; ii += 1) {
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
        var that = this;

        that.center = args.center;
        that.length = args.length;
        that.resident = false;
        that.busy = false;
    };

    // Subclass (or whatever the prototypical version is called) of Shape,
    // a random regular polygon
    // it can have 3-8 sides and spin clockwise or counter-clockwise
    Flatland.RandomShape = function (grid) {
        let that = this;
        this.grid = grid;
        this.spin = (Math.random() * Math.PI / 10) - Math.PI / 20;
        this.speed = 1;
        this.prev_grid = null;
        Flatland.Shape.apply(this, [{
            sides: Math.floor(Math.random() * 6) + 3,
            radius: Math.random() * (1 / 3) * (grid.length / 2) + (1 / 3) * (grid.length / 2),
            center: new Flatland.Point(grid.center),
            angle: Math.random() * Math.PI
        }]);

    };
    Flatland.RandomShape.prototype = new Flatland.Shape({});
    Flatland.RandomShape.prototype.draw = function (args) {
        var that = this;
        that.angle = Flatland.formatAngle(that.angle + that.spin);
        if (Math.abs(that.center.x - that.grid.center.x) < 1) {
            that.center.x = that.grid.center.x;
        } else if (that.center.x > that.grid.center.x) {
            that.center.x -= that.speed;
        } else if (that.center.x < that.grid.center.x) {
            that.center.x += that.speed;
        }

        if (Math.abs(that.center.y - that.grid.center.y) < 1) {
            that.center.y = that.grid.center.y;
        } else if (that.center.y > that.grid.center.y) {
            that.center.y -= that.speed;
        } else if (that.center.y < that.grid.center.y) {
            that.center.y += that.speed;
        }

        if (that.grid.center.x === that.center.x && that.grid.center.y === that.center.y) {
            that.grid.busy = false;
            if (that.prev_grid) {
                that.prev_grid.busy = false;
            }
        }

        return Flatland.Shape.prototype.draw.apply(that, [args]);
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
        let result = { distance: Infinity };
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
                    let d = Flatland.getDistance(p, origin);
                    if (d < result.distance) {
                        result = { distance: d, shape: shapes[ii] };
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
