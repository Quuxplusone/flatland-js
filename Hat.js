
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

Flatland.getArea = function (ps) {
  let a = 0;
  for (let i = 0; i < ps.length; ++i) {
    let j = (i+1) % ps.length;
    a += ps[i].x * ps[j].y - ps[i].y * ps[j].x;
  }
  return a / 2;
};

Flatland.getCentroid = function (ps) {
  if (ps.length == 2) {
    return {
      x: (ps[0].x + ps[1].x) / 2,
      y: (ps[0].y + ps[1].y) / 2,
    };
  }
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

Flatland.View = function (canvas, unitCells) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = this.canvas.height / unitCells;
    this.unitCells = unitCells;
};

Flatland.View.prototype.recomputeTileK = function (tile, bottomk, topk) {
  let unitCells = this.unitCells;
  let kFromY = function (y) {
    let ypos = (y * 1.5 / unitCells) + 0.5;
    ypos = Math.min(Math.max(0.0, ypos), 1.0);
    return (bottomk * ypos) + (topk * (1-ypos));
  };
  tile.k = kFromY(tile.y);
  tile.k = kFromY(Flatland.getCentroid(Flatland.getPoints(tile)).y);
  tile.k = kFromY(Flatland.getCentroid(Flatland.getPoints(tile)).y);
  tile.k = kFromY(Flatland.getCentroid(Flatland.getPoints(tile)).y);
  return tile.k;
}

Flatland.View.prototype.clear = function () {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

Flatland.View.prototype.drawActiveShape = function (shape) {
    for (let line of Flatland.getLineSegments(shape)) {
        this.drawLine(line.start, line.end, 2);
    }
};

Flatland.View.prototype.drawFixedShape = function (shape, snapTogether) {
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

Flatland.View.prototype.drawLine = function (start, end, width) {
    let x1 = this.scale * start.x + (this.canvas.width / 2);
    let y1 = this.scale * start.y + (this.canvas.height / 2);
    let x2 = this.scale * end.x + (this.canvas.width / 2);
    let y2 = this.scale * end.y + (this.canvas.height / 2);
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.closePath();
    this.ctx.stroke();
};

Flatland.View.prototype.drawCentroidPoint = function (tile) {
    let pixelsPerMeter = Math.max(this.canvas.width, this.canvas.height) / 1000;
    let p = Flatland.getCentroid(Flatland.getPoints(tile));
    let x1 = pixelsPerMeter * p.x + (this.canvas.width / 2);
    let y1 = pixelsPerMeter * p.y + (this.canvas.height / 2);
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(x1, y1, 5, 0, 2*Math.PI, false);
    this.ctx.closePath();
    this.ctx.stroke();

    let ps = Flatland.getPoints(tile);
    this.drawLine(ps[0], ps[3], 0.5);
    this.drawLine(ps[4], ps[8], 0.5);
    this.drawLine(ps[8], ps[12], 0.5);
    let c = Flatland.getCentroid([ps[0], ps[4], ps[8]]);
    this.drawLine(ps[3], c, 0.5);
    this.drawLine(ps[6], c, 0.5);
    this.drawLine(ps[12], c, 0.5);
    let c2 = Flatland.getCentroid([ps[10], ps[11]]);
    this.drawLine(ps[8], c2, 0.5);
};

Flatland.rotate = function (p, theta) {
  let t = Math.atan2(p.y, p.x);
  let r = Math.hypot(p.y, p.x);
  return {
    x: r * Math.cos(t + theta),
    y: r * Math.sin(t + theta)
  };
};

Flatland.getPoints = function (shape) {
  // Return a shape with a constant area 100.
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
    if (shape.flip) {
      ret[j].x = -ret[j].x;
    }
    ret[j] = Flatland.rotate(ret[j], shape.angle * Math.PI / 6);
  }
  let scalefactor = Math.sqrt(1.0 / Flatland.getArea(ret));
  for (let j = 0; j < ret.length; ++j) {
    ret[j].x *= scalefactor;
    ret[j].y *= scalefactor;
  }
  let c = Flatland.getCentroid(ret);
  for (let j = 0; j < ret.length; ++j) {
    ret[j].x += shape.x - c.x;
    ret[j].y += shape.y - c.y;
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

function initialHats() {
  let hats = [
    { x:  0, y:  0, angle:  8, flip: true },
    { x:  0, y:  3, angle:  6, flip: false },
    { x:  0, y:  5, angle: 10, flip: false },
    { x:  0, y:  9, angle:  2, flip: false },
    { x:  0, y: 12, angle:  0, flip: false },
    { x:  0, y: 14, angle:  8, flip: false },
    { x:  1, y:  1, angle:  8, flip: false },
    { x:  1, y:  4, angle: 10, flip: false },
    { x:  1, y:  7, angle:  0, flip: false },
  ];
  let adjust = function (tile) {
    let ps = Flatland.getPoints(tile);
    let c = Flatland.getCentroid([ps[0], ps[4], ps[8]]);
    tile.x = -c.x;
    tile.y = -c.y;
    return tile;
  };

  let tiles = [];
  for (let h of hats) {
    h.x = h.x + 1;
    h.y = 8 - h.y;
    let tile = {
      x: 0,
      y: 0,
      angle: (!h.flip ? (h.angle + 8) : (h.angle + 4)) % 12,
      flip: !h.flip,
      k: 1,
    };
    tile = adjust(tile);
    tile.x += 100*(h.x * Math.sqrt(3) - ((h.y + h.x) % 2) * 0.5);
    tile.y += 100*h.y;
  }
  return tiles;
}


window.onload = function () {
  let escherCanvas = window.document.getElementById("escherView");
  let escherCtx = escherCanvas.getContext('2d');
  let singleTopCanvas = window.document.getElementById("singleTopView");
  let singleTopCtx = singleTopCanvas.getContext('2d');
  let singleBottomCanvas = window.document.getElementById("singleBottomView");
  let singleBottomCtx = singleBottomCanvas.getContext('2d');

  let escherView = new Flatland.View(escherCanvas, 10);
  let singleTopView = new Flatland.View(singleTopCanvas, 2);
  let singleBottomView = new Flatland.View(singleBottomCanvas, 2);
  let fixedTiles = initialHats();
  let snapTogether = false;

  let tile = {
    x: 0,
    y: 0,
    k: 1,
    angle: 0,
    flip: false,
  };
  let topk = 0;
  let bottomk = Math.PI/2;
  let activeMode = 'escher';
  tile.k = escherView.recomputeTileK(tile, bottomk, topk);

  singleTopCanvas.onclick = function (e) {
    activeMode = 'top';
  };
  singleBottomCanvas.onclick = function (e) {
    activeMode = 'bottom';
  };
  escherCanvas.onclick = function (e) {
    activeMode = 'escher';
  };

  window.document.onkeydown = function (e) {
    if (e.key == 'q') { // turn left
      tile.angle = (tile.angle + 11) % 12;
    } else if (e.key == 'w') { // turn right
      tile.angle = (tile.angle + 1) % 12;
    } else if (e.key == 's' && activeMode == 'top') { // morph
      topk = Math.min(topk + Math.PI / 120, Math.PI / 2);
    } else if (e.key == 's' && activeMode == 'bottom') { // morph
      bottomk = Math.min(bottomk + Math.PI / 120, Math.PI / 2);
    } else if (e.key == 'a' && activeMode == 'top') { // morph back
      topk = Math.max(topk - Math.PI / 120, 0);
    } else if (e.key == 'a' && activeMode == 'bottom') { // morph back
      bottomk = Math.max(bottomk - Math.PI / 120, 0);
    } else if (e.key == 'f') { // flip
      tile.flip = !tile.flip;
    } else if (e.keyCode == 37) { // left
      tile.x -= 0.1;
    } else if (e.keyCode == 39) { // right
      tile.x += 0.1;
    } else if (e.keyCode == 38) { // up
      tile.y -= 0.1;
    } else if (e.keyCode == 40) { // down
      tile.y += 0.1;
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
    tile.k = escherView.recomputeTileK(tile, bottomk, topk);
  };

  let timeStep = function () {
    // clear the canvases before doing anything
    escherView.clear();
    singleTopView.clear();
    singleBottomView.clear();
    for (let i = 0; i < fixedTiles.length; ++i) {
      escherView.drawFixedShape(fixedTiles[i], snapTogether);
    }
    escherView.drawLine({x:-1, y:-10}, {x:-1, y:10}, 0.2);
    escherView.drawLine({x:0, y:-10}, {x:0, y:10}, 0.2);
    escherView.drawLine({x:1, y:-10}, {x:1, y:10}, 0.2);
    escherView.drawLine({x:-10, y:-1}, {x:10, y:-1}, 0.2);
    escherView.drawLine({x:-10, y:0}, {x:10, y:0}, 0.2);
    escherView.drawLine({x:-10, y:1}, {x:10, y:1}, 0.2);
    escherView.drawActiveShape(tile);
    singleTopView.drawActiveShape({x: 0, y: 0, k: topk, angle: tile.angle, flip: false});
    singleTopView.drawCentroidPoint({x: 0, y: 0, k: topk, angle: tile.angle, flip: false});
    singleBottomView.drawActiveShape({x: 0, y: 0, k: bottomk, angle: tile.angle, flip: false});
    singleBottomView.drawCentroidPoint({x: 0, y: 0, k: bottomk, angle: tile.angle, flip: false});
  };
  window.setInterval(timeStep, 100);
};
