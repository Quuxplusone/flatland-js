var Flatland;
Flatland = Flatland || {};

(function () {
    'use strict';

    // View is an object representing the context where we draw
    // what it looks like from the square's perspective.
    // The context should have the same width as the main context
    // but the height can be different.
    Flatland.View = function (args) {
        var that = this;

        that.height = args.height;
        that.width = args.width;
        that.rays = args.rays;

        that.step = that.width / that.rays;
    };

    // The further away an object is, the lighter it is.
    Flatland.View.prototype.getColor = function (distance) {
        if (distance === Infinity) {
            return 'rgb(240,248,255)';
        }
        let shapeFraction = Math.min(Math.max(0.0, Math.pow(0.99, distance)), 1.0);
        let fogFraction = 1.0 - shapeFraction;
        let shapeContribution = [47, 79, 79].map(x => shapeFraction * x);
        let fogContribution = [240, 248, 255].map(x => fogFraction * x);
        let color = shapeContribution.map((sc, i) => sc + fogContribution[i]);
        return 'rgb(' + color[0].toFixed(0) + ',' + color[1].toFixed(0) + ',' + color[2].toFixed(0) + ')';
    };

    // given a list of intersections (or objects with
    // distance (Number) and border (Bool) fields), draws
    // draws to the context for each intersection. The closer
    // the object is, the darker it will be.
    Flatland.View.prototype.draw = function (args) {
        var that = this;
        let intersections = args.intersections;
        let ctx = args.context;

        for (let ii = 0; ii < intersections.length; ++ii) {
            let d = intersections[ii].distance;
            ctx.beginPath();
            ctx.moveTo(that.step * ii, 0);
            ctx.lineTo(that.step * ii, that.height);
            ctx.lineWidth = that.step;
            ctx.strokeStyle = that.getColor(d);
            ctx.stroke();
        }
    };

}());
