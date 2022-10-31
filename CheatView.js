// CheatView is the top-down, out-of-universe view.

Flatland.CheatView = function (canvas) {
    this.ctx = canvas.getContext('2d');
};

Flatland.CheatView.prototype.drawShape = function (shape) {
    for (let line of Flatland.getLineSegments(shape)) {
        line.draw(this.ctx);
    }
};
