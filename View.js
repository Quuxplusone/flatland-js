// View is an object representing the context where we draw
// what it looks like from the square's perspective.

Flatland.View = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {willReadFrequently: true});
};

Flatland.View.prototype.getColorOfRay = function (ray) {
    // Each ray holds a 'distance', a 'shape', and a 'normal'.
    let fogColor = [192, 198, 216];
    let daylightColor = [255, 255, 224];

    let angleToDaylight = 0;  // Light comes from the East
    let angleToEye = ray.angle + Math.PI;

    if (ray.distance === Infinity) {
        return Flatland.lerp(0.3 * Math.pow(Math.cos(angleToDaylight - ray.angle), 3.0), fogColor, daylightColor);
    }

    let angleOfReflection = ray.normal - (angleToEye - ray.normal);
    let ambientFactor = 0.5;
    let diffuseDaylightFactor = 0.5 * Math.max(0, Math.cos(angleToDaylight - ray.normal));
    let diffuseHeadlampFactor = 0.2 * Math.max(0, Math.cos(angleToEye - ray.normal));
    let litShapeColor = Flatland.lerp(ambientFactor + diffuseDaylightFactor + diffuseHeadlampFactor, [0,0,0], ray.shape.color);

    let specularDaylightFactor = Math.pow(Math.max(0, Math.cos(angleToDaylight - angleOfReflection)), 15.0);
    let specularHeadlampFactor = Math.min(Math.pow(0.4, ray.distance / Flatland.meters(100)), 0.25) * Math.pow(Math.max(0, Math.cos(angleToEye - angleOfReflection)), 30.0);
    let specularDaylightComponent = Flatland.lerp(specularDaylightFactor * ray.shape.specularFactor, [0,0,0], daylightColor);
    let specularHeadlampComponent = Flatland.lerp(specularHeadlampFactor * ray.shape.specularFactor, [0,0,0], [255,255,255]);
    litShapeColor = litShapeColor.map((x, i) => Math.min(255, x + specularDaylightComponent[i] + specularHeadlampComponent[i]));

    let fogFactor = Math.min(Math.max(0.0, Math.pow(0.4, ray.distance / Flatland.meters(500))), 1.0);
    let rgb = Flatland.lerp(fogFactor, fogColor, litShapeColor);
    return rgb;
};

Flatland.View.prototype.drawRays = function (rays) {
    let w = this.canvas.width;
    let h = this.canvas.height;
    let nrays = rays.length;
    for (let ray of rays) {
        ray.color = this.getColorOfRay(ray);
    }
    var imgData = this.ctx.createImageData(nrays, 1);
    for (let i = 0; i < nrays; ++i) {
        let sd = (500 / nrays) * Math.min(Math.max(0.01, rays[i].distance / Flatland.meters(500)), 1);
        let data = [0,0,0,0];
        for (let j = i - 4; j <= i + 4; ++j) {
            if (0 <= j && j < nrays) {
                let weight = Math.exp(-0.5 * Math.pow(Math.abs(j-i) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
                let rgb = rays[j].color;
                data[0] += weight * rgb[0];
                data[1] += weight * rgb[1];
                data[2] += weight * rgb[2];
                data[3] += weight;
            }
        }
        imgData.data[4*i+0] = data[0] / data[3];
        imgData.data[4*i+1] = data[1] / data[3];
        imgData.data[4*i+2] = data[2] / data[3];
        imgData.data[4*i+3] = 255;
    }
    createImageBitmap(imgData).then(img => this.ctx.drawImage(img, 0, 0, nrays, 1, 0, 0, w, h));
};

Flatland.View.prototype.drawCrosshairs = function () {
    this.ctx.globalCompositeOperation = 'difference';
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(this.canvas.width / 2 - 1, this.canvas.height / 2 - 6, 2, 12);
    this.ctx.fillRect(this.canvas.width / 2 - 6, this.canvas.height / 2 - 1, 5, 2);
    this.ctx.fillRect(this.canvas.width / 2 + 1, this.canvas.height / 2 - 1, 5, 2);
};
