
let CLOSENESS = 10;

var Flatland = {};

Flatland.getDistance = function (p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
};

let fixedPoints = [];
let closestPoint = function (p) {
  let minPt = p;
  let minDist = 10000;
  for (let i = 0; i < fixedPoints.length; ++i) {
    let d = Flatland.getDistance(p, fixedPoints[i]);
    if (d < minDist) {
      minPt = fixedPoints[i];
      minDist = d;
    }
  }
  return minPt;
};
let recomputeFixedPoints = function (fixedTiles) {
  let allpoints = [];
  for (let i = 0; i < fixedTiles.length; ++i) {
    let points = Flatland.getPoints(fixedTiles[i]);
    for (let j = 0; j < points.length; ++j) {
      allpoints.push(points[j]);
    }
  }
  // Now group the points that differ by less than 3*CLOSENESS.
  let groups = [];
  for (let i = 0; i < allpoints.length; ++i) {
    let done = false;
    for (let j = 0; j < groups.length; ++j) {
      if (Flatland.getDistance(allpoints[i], groups[j][0]) < 3*CLOSENESS) {
        groups[j].push(allpoints[i]);
        done = true;
        break;
      }
    }
    if (!done) {
      groups.push([ allpoints[i] ]);
    }
  }
  // Now average each group of points.
  fixedPoints = [];
  for (let i = 0; i < groups.length; ++i) {
    let g = groups[i];
    let sumX = 0;
    let sumY = 0;
    for (let j = 0; j < g.length; ++j) {
      sumX += g[j].x;
      sumY += g[j].y;
    }
    fixedPoints.push({ x: sumX / g.length, y: sumY / g.length });
  }
};

function recomputeTileK(tile) {
  let kFromY = function (y) {
    let ypos = (y + 420) / (420+250);
    ypos = Math.min(Math.max(0.0, ypos), 1.0);
    return (0.5 * ypos) + (0.8333 * (1-ypos));
  };
  tile.k = kFromY(tile.y);
  tile.k = kFromY(Flatland.getCentroid(Flatland.getPoints(tile)).y);
  tile.k = kFromY(Flatland.getCentroid(Flatland.getPoints(tile)).y);
  tile.k = kFromY(Flatland.getCentroid(Flatland.getPoints(tile)).y);
  return tile.k;
}

Flatland.getCentroid = function (ps) {
  let a = 0;
  let c = {x: 0, y: 0};
  let n = ps.length;
  for (let i = 0; i < n; ++i) {
    let j = (i+1) % n;
    let k = ps[i].x * ps[j].y - ps[j].x * ps[i].y;
    a += k;
    c = {
      x: c.x + k*(ps[i].x + ps[j].x),
      y: c.y + k*(ps[i].y + ps[j].y),
    };
  }
  return {
    x: c.x / (3 * a),
    y: c.y / (3 * a),
  };
};

Flatland.CheatView = function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
};

Flatland.CheatView.prototype.drawActiveShape = function (shape) {
    for (let line of Flatland.getLineSegments(shape)) {
        this.drawLine(line.start, line.end, 2);
    }
};

Flatland.CheatView.prototype.drawFixedShape = function (shape, snapTogether) {
    if (snapTogether) {
        for (let line of Flatland.getLineSegments(shape)) {
            this.drawLine(closestPoint(line.start), closestPoint(line.end), 1);
        }
    } else {
        for (let line of Flatland.getLineSegments(shape)) {
            this.drawLine(line.start, line.end, 1);
        }
    }
};

Flatland.CheatView.prototype.drawLine = function (start, end, width) {
    let dim = Math.max(this.canvas.width, this.canvas.height);
    let pixelsPerMeter = dim / Flatland.meters(1000);
    let x1 = pixelsPerMeter * start.x + (this.canvas.width / 2);
    let y1 = pixelsPerMeter * start.y + (this.canvas.height / 2);
    let x2 = pixelsPerMeter * end.x + (this.canvas.width / 2);
    let y2 = pixelsPerMeter * end.y + (this.canvas.height / 2);
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.closePath();
    this.ctx.stroke();
};

Flatland.meters = function (x) { return x; };

Flatland.rotate = function (p, theta) {
  let t = Math.atan2(p.y, p.x);
  let r = Math.hypot(p.y, p.x);
  return {
    x: r * Math.cos(t + theta),
    y: r * Math.sin(t + theta)
  };
};

Flatland.getPoints = function (shape) {
      let a = 100 * Math.cos(shape.k);
      let b = 100 * Math.sin(shape.k);
      let dist = function (p, q) {
        return Math.sqrt( Math.pow((p[0] - q[0]), 2) + Math.pow((p[1] - q[1]), 2) );
      };
      const hr3 = 0.5 * Math.sqrt(3.0);
      const base_shape = [
        [0, 0],
        [0, -hr3],
        [0.5, -hr3],
        [0.75, -0.5*hr3],
        [1.5, -hr3],
        [2.25, -0.5*hr3],
        [2, 0],
        [2.25, 0.5*hr3],
        [1.5, hr3],
        [1.5, 2*hr3],
        [1, 2*hr3],
        [0.5, hr3],
        [0.75, 0.5*hr3],
      ];
      const sc1 = 2 * a;
      const sc2 = 2 * b * Math.sqrt(3) / 3;
      let ret = [
        {x: 0, y: 0}
      ];
      for (let j = 0; j < base_shape.length - 1; ++j) {
        let i = j + 1;
        let d = dist(base_shape[i-1], base_shape[i]);
        // Side lengths alternate
        let sc = (Math.abs(d - hr3) < 1e-5) ? sc2 : sc1;
        let v = {
          x: base_shape[i][0] - base_shape[i-1][0],
          y: base_shape[i][1] - base_shape[i-1][1]
        };
        p = ret[ret.length-1];
        ret.push({ x: p.x + sc * v.x, y: p.y + sc * v.y });
      }
      
      for (let j = 0; j < ret.length; ++j) {
        ret[j].x -= 106.2983481374135;
        ret[j].y -= 70.17033416883338;
        if (shape.flip) {
            ret[j].x = -ret[j].x;
        }
        ret[j] = Flatland.rotate(ret[j], shape.angle);
        ret[j].x += shape.x;
        ret[j].y += shape.y;
      }
      return ret;
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

Flatland.jiggleIntoPlace = function (fixedTiles, tile) {
  let adjustX = 0.0;
  let adjustY = 0.0;
  let adjustN = 0;
  const p1 = Flatland.getPoints(tile);
  for (let i = 0; i < fixedTiles.length; ++i) {
    let p2 = Flatland.getPoints(fixedTiles[i]);
    console.assert(p1.length == p2.length);
    for (let j = 0; j < p1.length; ++j) {
      for (let k = 0; k < p2.length; ++k) {
        if (Math.hypot(p2[k].x - p1[j].x, p2[k].y - p1[j].y) < CLOSENESS) {
          adjustX += (p2[k].x - p1[j].x);
          adjustY += (p2[k].y - p1[j].y);
          adjustN += 1;
        }
      }
    }
  }
  if (adjustN == 0) {
    return {x: 0, y: 0};
  }
  return {
    x: adjustX / adjustN,
    y: adjustY / adjustN,
  };
};

window.onload = function () {
    let cheatCanvas = window.document.getElementById("cheatView");
    let cheatCtx = cheatCanvas.getContext('2d');

    let cheatView = new Flatland.CheatView(cheatCanvas);
    let fixedTiles = [];
    let snapTogether = false;

    let tile = {
      x: 100,
      y: 100,
      k: 1.0,
      angle: 0.0,
      flip: false,
    };
    tile.k = recomputeTileK(tile);

    window.document.onkeydown = function (e) {
        if (e.key == 'q') { // turn left
            tile.angle -= 3.14159265358979/6;
        } else if (e.key == 'w') { // turn right
            tile.angle += 3.14159265358979/6;
        } else if (e.key == 'a') { // morph
            tile.k += 0.1;
        } else if (e.key == 's') { // morph back
            tile.k -= 0.1;
        } else if (e.key == 'f') { // flip
            tile.flip = !tile.flip;
        } else if (e.keyCode == 37) { // left
            tile.x -= 10;
        } else if (e.keyCode == 39) { // right
            tile.x += 10;
        } else if (e.keyCode == 38) { // up
            tile.y -= 10;
        } else if (e.keyCode == 40) { // down
            tile.y += 10;
        } else if (e.key == 'j') { // jiggle
            // Angle is always exact. Only x and y need to be jiggled.
            let adjust = Flatland.jiggleIntoPlace(fixedTiles, tile);
            console.log(tile);
            tile.x += adjust.x;
            tile.y += adjust.y;
            console.log(tile);
        } else if (e.key == ' ' || e.keyCode == 13) { // commit
            fixedTiles.push(tile);
            console.log(fixedTiles);
            tile = {
              x: tile.x,
              y: tile.y,
              k: tile.k,
              angle: tile.angle,
              flip: tile.flip,
            };
            recomputeFixedPoints(fixedTiles);
        } else if (e.key == '!') { // snap together
            snapTogether = !snapTogether;
        } else {
            console.log("keydown:", e.key, e.keyCode);
        }
        tile.k = recomputeTileK(tile);
    };

    let timeStep = function () {
        // clear the canvases before doing anything
        cheatCtx.clearRect(0, 0, cheatCanvas.width, cheatCanvas.height);
        for (let i = 0; i < fixedTiles.length; ++i) {
          cheatView.drawFixedShape(fixedTiles[i], snapTogether);
        }
        cheatView.drawActiveShape(tile);
    };
    window.setInterval(timeStep, 100);
};
