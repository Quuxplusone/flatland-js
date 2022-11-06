// CheatView is the top-down, out-of-universe view.

Flatland.CheatView = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
};

Flatland.CheatView.prototype.drawShape = function (shape) {
    for (let line of Flatland.getLineSegments(shape)) {
        this.drawLine(line.start, line.end);
    }
};

Flatland.CheatView.prototype.drawLine = function (start, end) {
    let dim = Math.max(this.canvas.width, this.canvas.height);
    let x1 = (dim / 500) * start.x + (this.canvas.width / 2);
    let y1 = (dim / 500) * start.y + (this.canvas.height / 2);
    let x2 = (dim / 500) * end.x + (this.canvas.width / 2);
    let y2 = (dim / 500) * end.y + (this.canvas.height / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.closePath();
    this.ctx.stroke();
};
