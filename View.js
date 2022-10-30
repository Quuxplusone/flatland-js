(function () {

    // View is an object representing the context where we draw
    // what it looks like from the square's perspective.

    Flatland.View = function (canvas, nrays) {
        this.ctx = canvas.getContext('2d');
        this.height = canvas.height;
        this.step = canvas.width / nrays;
    };

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

    Flatland.View.prototype.draw = function (rays) {
        // Each ray holds a 'distance' and a 'shape'.
        for (let ii = 0; ii < rays.length; ++ii) {
            let d = rays[ii].distance;
            this.ctx.beginPath();
            this.ctx.moveTo(this.step * ii, 0);
            this.ctx.lineTo(this.step * ii, this.height);
            this.ctx.lineWidth = this.step;
            this.ctx.strokeStyle = this.getColor(d);
            this.ctx.stroke();
        }
    };

}());
