// View is an object representing the context where we draw
// what it looks like from the square's perspective.

Flatland.View = function (canvas, nrays) {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.nrays = nrays;
};

Flatland.View.prototype.getColor = function (ray) {
    let fogColor = Flatland.lerp(0.25, [50,50,100], [240, 248, 255]);
    let daylightColor = [255, 255, 224];
    let specularLightColor = [255, 255, 255];

    let angleToDaylight = Math.PI;  // Light comes from the East
    let angleToEye = ray.angle + Math.PI;

    if (ray.distance === Infinity) {
        return Flatland.lerp(0.5 * Math.pow(Math.cos(angleToEye - angleToDaylight), 3.0), fogColor, daylightColor);
    }

    let angleOfReflection = ray.normal - (angleToEye - ray.normal);
    let ambientFactor = 0.5;
    let diffuseDaylightFactor = 0.5 * Math.max(0, Math.cos(angleToDaylight - ray.normal));
    let diffuseHeadlampFactor = 0.2 * Math.max(0, Math.cos(angleToEye - ray.normal));
    let litShapeColor = Flatland.lerp(ambientFactor + diffuseDaylightFactor + diffuseHeadlampFactor, [0,0,0], ray.shape.color);

    let specularDaylightFactor = Math.pow(Math.max(0, Math.cos(angleToDaylight - angleOfReflection)), 15.0);
    let specularHeadlampFactor = 0.5 * Math.pow(Math.max(0, Math.cos(angleToEye - angleOfReflection)), 30.0);
    let specularDaylightComponent = Flatland.lerp(specularDaylightFactor, [0,0,0], daylightColor);
    let specularHeadlampComponent = Flatland.lerp(specularHeadlampFactor, [0,0,0], [255,255,255]);
    litShapeColor = litShapeColor.map((x, i) => Math.min(255, x + specularDaylightComponent[i] + specularHeadlampComponent[i]));

    let fogFactor = Math.min(Math.max(0.0, Math.pow(0.999, ray.distance)), 1.0);
    let rgb = Flatland.lerp(fogFactor, fogColor, litShapeColor);
    return rgb;
};

Flatland.View.prototype.drawRays = function (rays) {
    // Each ray holds a 'distance', a 'shape', and a 'normal'.
    for (let ii = 0; ii < rays.length; ++ii) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.width * ii / this.nrays, 0);
        this.ctx.lineTo(this.width * ii / this.nrays, this.height);
        this.ctx.lineWidth = this.width / this.nrays;
        let rgb = this.getColor(rays[ii]);
        this.ctx.strokeStyle = 'rgb(' + rgb[0].toFixed(0) + ',' + rgb[1].toFixed(0) + ',' + rgb[2].toFixed(0) + ')';
        this.ctx.stroke();
    }
};

Flatland.View.prototype.drawCrosshairs = function () {
    this.ctx.globalCompositeOperation = 'difference';
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(this.width / 2 - 1, this.height / 2 - 6, 2, 12);
    this.ctx.fillRect(this.width / 2 - 6, this.height / 2 - 1, 5, 2);
    this.ctx.fillRect(this.width / 2 + 1, this.height / 2 - 1, 5, 2);
};
