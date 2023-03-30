
var Flatland = {};

// We need a data structure that can:
// - Map each [i,j] to an identifier ID
// - For a given [i,j], look up all other [i,j] with the same ID
// We'll store an array of arrays `A[i][j]=ID` and a dict of lists D[ID]=[[i1,j1],[i2,j2],...].
//
Flatland.cornerStructure = {
  A: [],
  D: {},
  nextId: 1,

  countTilesAtCornerPoint: function (i, j) {
    let id = this.A[i][j];
    console.assert(id >= 1);
    return this.D[id].length;
  },

  getSmoothedCornerPoint: function (fixedTiles, i, j) {
    // Get the current position of fixedTiles[i].points[j], as the average
    // of all the points associated with that corner in our data structure.
    let id = this.A[i][j];
    console.assert(id >= 1);
    let pts = this.D[id];
    let x = 0;
    let y = 0;
    for (let p of pts) {
      x += fixedTiles[p.i].points[p.j].x;
      y += fixedTiles[p.i].points[p.j].y;
    }
    return { x: x / pts.length, y: y / pts.length };
  },

  memorizeCorners: function (fixedTiles) {
    let allpoints = [];
    for (let i = 0; i < fixedTiles.length; ++i) {
      let pts = Flatland.getPoints(fixedTiles[i]);
      let arr = [];
      for (let j = 0; j < pts.length; ++j) {
        allpoints.push({ i: i, j: j, x: pts[j].x, y: pts[j].y });
        arr.push(0);
      }
      if (i >= this.A.length) {
        this.A.push(arr);
      }
    }

    for (let p of allpoints) {
      // For each key, map it to a unique "group" identifier.
      if (this.A[p.i][p.j] !== 0) {
        // Cool, do nothing
      } else {
        // Search for any other points close to p.
        // They should all have the same group identifier.
        let foundId = 0;
        for (let p2 of allpoints) {
          if (p !== p2 && p.i != p2.i && Flatland.getSquaredDistance(p, p2) < 0.01) {
            let id2 = this.A[p2.i][p2.j];
            if (id2 !== 0) {
              console.assert(foundId == 0 || foundId == id2);
              foundId = id2;
            }
          }
        }
        if (foundId === 0) {
          foundId = this.nextId++;
          this.D[foundId] = [];
        }
        this.A[p.i][p.j] = foundId;
        this.D[foundId].push({ i: p.i, j: p.j });
      }
    }
  },
};

Flatland.getSquaredDistance = function (p1, p2) {
  let dx = (p2.x - p1.x);
  let dy = (p2.y - p1.y);
  return dx*dx + dy*dy;
};

Flatland.getDistance = function (p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
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

Flatland.View = function (canvas, unitCells, leftToRight) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.setUnitCells(unitCells, leftToRight);
};

Flatland.View.prototype.setUnitCells = function (unitCells, leftToRight) {
  this.leftToRight = leftToRight;
  this.unitCells = unitCells;
  if (leftToRight) {
    this.scale = this.canvas.width / unitCells;
  } else {
    this.scale = this.canvas.height / unitCells;
  }
};

Flatland.View.prototype.recomputeTileK = function (tile, bottomk, topk) {
  let unitCells = this.unitCells;
  let leftToRight = this.leftToRight;
  let kFromPoint = function (p) {
    let x = (leftToRight ? p.x * 1.2 : p.y * 1.5);
    let xpos = (x / unitCells) + 0.5;
    xpos = Math.min(Math.max(0.0, xpos), 1.0);
    return (bottomk * xpos) + (topk * (1-xpos));
  };
  tile.k = kFromPoint(tile);
  tile.k = kFromPoint(Flatland.getCentroid(Flatland.getPoints(tile)));
  tile.k = kFromPoint(Flatland.getCentroid(Flatland.getPoints(tile)));
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

Flatland.View.prototype.drawFixedShape = function (fixedTiles, i, snapTogether, weight) {
  let n = fixedTiles[i].points.length;
  if (snapTogether) {
    for (let j = 0; j < n; ++j) {
      let start = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, j);
      let end = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, (j + 1) % n);
      this.drawLine(start, end, weight);
    }
  } else {
    for (let j = 0; j < n; ++j) {
      let start = fixedTiles[i].points[j];
      let end = fixedTiles[i].points[(j + 1) % n];
      this.drawLine(start, end, weight);
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
    this.ctx.arc(x1, y1, 3, 0, 2*Math.PI, false);
    this.ctx.closePath();
    this.ctx.stroke();

    let ps = Flatland.getPoints(tile);
    let c = Flatland.getCentroid([ps[0], ps[4], ps[8]]);
    let c2 = Flatland.getCentroid([ps[10], ps[11]]);
    let c3 = Flatland.getCentroid([c, ps[6]]);
    this.drawLine(ps[0], ps[3], 0.5);
    this.drawLine(ps[8], ps[12], 0.5);
    this.drawLine(ps[4], c3, 0.5);
    this.drawLine(ps[8], c3, 0.5);
    this.drawLine(ps[3], c, 0.5);
    this.drawLine(ps[6], c, 0.5);
    this.drawLine(ps[12], c, 0.5);
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
  // Return a shape with a constant area 8/3 of a triangle-with-unit-base, i.e. ~1.1547005383792515.
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
  let scalefactor = Math.sqrt(1.1547005383792515 / Flatland.getArea(ret));
  for (let j = 0; j < ret.length; ++j) {
    ret[j].x *= scalefactor;
    ret[j].y *= scalefactor;
  }
  for (let j = 0; j < ret.length; ++j) {
    if (!shape.flip) {
      ret[j].x = -ret[j].x;
      ret[j] = Flatland.rotate(ret[j], -shape.k/2 + (shape.angle - 3) * Math.PI / 6);
    } else {
      ret[j] = Flatland.rotate(ret[j], -shape.k/2 + (shape.angle + 5) * Math.PI / 6);
    }
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

Flatland.jiggleFixedTile = function (fixedTiles, i) {
  let adjustX = 0.0;
  let adjustY = 0.0;
  let adjustN = 1;
  for (let j = 0; j < fixedTiles[i].points.length; ++j) {
    let p = fixedTiles[i].points[j];
    let idealp = Flatland.cornerStructure.getSmoothedCornerPoint(fixedTiles, i, j);
    let weight = Flatland.cornerStructure.countTilesAtCornerPoint(i, j);
    adjustX += (weight - 1) * (idealp.x - p.x);
    adjustY += (weight - 1) * (idealp.y - p.y);
    adjustN += (weight - 1);
  }
  return {
    x: adjustX / adjustN,
    y: adjustY / adjustN,
  };
};

function initialHats() {
  let hats = {
    0: ".6.10...10..4.8...0.8..8f.2.6..4..6..4..0f.2.6.6.",
    1: "2.10..8...0.0.8.6f..6.10...10..4.8..4f.6.6...2.10..",
    2: ".2..0.0.10f..2.6..8..10..8..4f.6.6.6...2..4..2..0.",
    3: "..0f.2.10..4..10..4.8..4f.6.6...2.10..4...4.0..0f.2.",
    4: ".6...2..0.8..4f.6.6.6...2..4..2..0.8.2f..2.6...2",
    5: "10..4..0f.2.6.6...2.10..4...4.0..0f.2.6..4..10..4..",
    6: ".4f.6.6...2.10..4..10..0.8.2f..2.6...2..4.8...0.0.",
    7: "6...2..4..2..0.8..8f.2.6..4..10..4...4.0.0.10f..2.",
    8: "..4...4.0..0f.2.6.10...10..4.8...0.8.2f..2.10..4..10",
    9: ".0.8.2f..2.6...2.10..8...0.0.8.6f..6..4..2..0.8..",
    10: ".2.6..4..10..4..10..0.0.10f..2.6..8...4.0..0f.2.6.6",
    11: "..10..4.8...0.8..8f.2.10..4..10..4.8.2f..2.6...2.10.",
    12: "8...0.0.8.6f..6.10...2..0.8..4f.6.6..4..10..4..10..",
    13: ".0.10f..2.6..8..10..0..0f.2.6.6...2..4.8...0.8..8f.",
    14: ".10..4..10..4.8..8f.2.6...2.10..4...4.0.8.6f..6.10..",
    15: "...0.8..4f.6.6.10...10..4..10..0.8.2f..2.6..8..10..8",
    16: "8.6f..6.6...2.10..8...0.8..8f.2.6..4..10..4.8...0.",
    17: "6..8..10..4..10..0.8.6f..6.10...10..4.8...0.0.0.10f..",
    18: "..4.8...0.8..8f.2.6..8..10..8...0.0.0.10f..2.10..4.",
    19: ".4.0.8.6f..6.10...10..4.8...0.0.10f..2.10..4..10..0.8",
    20: "2f..2.6..8..10..8...0.0.0.10f..2..4..2..0.8..8f.2.6",
    21: ".4..10..4.8...0.0.10f..2.10..4...4.0..0f.2.6.10...10..",
    22: "4.8...0.0.0.10f..2..4..2..0.8.2f..2.6...2.10..8...0",
    23: ".0.0.10f..2.10..4...4.0..0f.2.6..4..10..4..2..0.0.10f",
    24: ".2.10..4..10..0.8.2f..2.6...2..4.8...0.0..0f.2.10..4",
    25: "..2..0.8..8f.2.6..4..10..4...4.0.0.10f..2.6...2..0.",
    26: "0..0f.2.6.10...10..4.8...0.8.2f..2.10..4..10..4..0f.2.",
    27: "2.6...2.10..8...0.0.8.6f..6..4..2..0.8..4f.6.6...2",
    28: ".10..4..10..0.0.10f..2.6..8...4.0..0f.2.6.6...2..4.",
    29: "...0.8..8f.2.10..4..10..4.8.2f..2.6...2.10..4...4.0.",
    30: "8.6f..6.10...2..0.8..4f.6.6..4..10..4..10..0.8.2f..2",
    31: "6..8..10..0..0f.2.6.6...2..4.8...0.8..8f.2.6..4..10",
    32: "..4.8..8f.2.6...2.10..4...4.0.8.6f..6.10...10..4.8..",
    33: "4f.6.6.10...10..4..10..0.8.2f..2.6..8..10..8...0.0.8.",
    34: "...2.10..8...0.8..8f.2.6..4..10..4.8...0.0.10f..2.6",
    35: ".4..10..0.8.6f..6.10...10..4.8...0.0.8.6f..10..4..10..",
    36: "0.8..8f.2.6..8..10..8...0.0.0.10f..2.6..8...0.8..4f",
    37: "2.6.10...10..4.8...0.0.10f..2.10..4..10..4.8.6f..6.6.",
    38: ".2.10..8...0.0.0.10f..2..4..2..0.8..4f.6.6..8..10..4",
    39: "..2..0.0.10f..2.10..4...4.0..0f.2.6.6...2..4.8...0",
    40: "0..0f.2.10..4..10..0.8.2f..2.6...2.10..4...4.0.8.6f.",
    41: "2.6...2..0.8..8f.2.6..4..10..4..10..0.8.2f..2.6..8.",
    42: ".10..4..0f.2.6.10...10..4.8...0.8..8f.2.6..4..10..4.",
    43: "..4f.6.6...2.10..8...0.0.8.6f..6.10...10..4.8..4f.6.6",
    44: ".6...2..4..2..0.0.10f..2.6..8..10..8..4f.6.6.6...2",
    45: "10..4...4.0..0f.2.10..4..10..4.8..4f.6.6...2.10..4..10",
    46: "..0.8.2f..2.6...2..0.8..4f.6.6.6...2..4..2..0.8..",
    47: "8f.2.6..4..10..4..0f.2.6.6...2.10..4...4.0..0f.2.6.",
  };
  let adjust = function (tile) {
    let ps = Flatland.getPoints(tile);
    let c = Flatland.getCentroid([ps[0], ps[4], ps[8]]);
    tile.x = -c.x;
    tile.y = -c.y;
    return tile;
  };

  let tiles = [];
  for (let col in hats) {
    let s = hats[col];
    let hx = parseInt(col);
    let hy = 0;
    for (let i = 0; i < s.length; ++i) {
      if (s[i] == '.') {
        // do nothing
      } else {
        let angle = parseInt(s.substr(i));
        while (i < s.length && s[i] != '.') ++i;
        let flip = (s[i-1] == 'f');
        let tile = adjust({ x: 0, y: 0, angle: angle, flip: flip, k: Math.PI/3 });
        tile.x += (hx * Math.sqrt(3)/2 - ((hy + hx + 1) % 2) * 0.25);
        tile.y -= hy * 0.5;
        tile.x -= 21.042;
        tile.y += 11;
        tiles.push(tile);
        ++hy;
      }
      hy += 1;
    }
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

  let escherView = new Flatland.View(escherCanvas, 22);
  let singleTopView = new Flatland.View(singleTopCanvas, 2);
  let singleBottomView = new Flatland.View(singleBottomCanvas, 2);
  let fixedTiles = initialHats();
  let snapTogether = true;
  let showGrid = false;
  let showFlips = false;
  let showNumCells = 22;
  let leftToRight = false;

  Flatland.cornerStructure.memorizeCorners(fixedTiles);

  let topk = Math.PI/3;
  let bottomk = Math.PI/3;

  singleTopCanvas.onclick = function (e) {
    singleBottomCanvas.dataset.active = (singleTopCanvas.dataset.active != "true") ? "true" : "false";
    singleTopCanvas.dataset.active = "true";
  };
  singleBottomCanvas.onclick = function (e) {
    singleTopCanvas.dataset.active = (singleBottomCanvas.dataset.active != "true") ? "true" : "false";
    singleBottomCanvas.dataset.active = "true";
  };

  window.document.onkeydown = function (e) {
    let kChanged = false;
    let kStep = Math.PI / 240;
    if (e.key == 'q') { // turn left
      tile.angle = (tile.angle + 11) % 12;
    } else if (e.key == 'w') { // turn right
      tile.angle = (tile.angle + 1) % 12;
    } else if (e.key == 's') { // morph
      if (singleTopCanvas.dataset.active == "true") {
        topk = Math.min(topk + kStep, Math.PI / 2);
      }
      if (singleBottomCanvas.dataset.active == "true") {
        bottomk = Math.min(bottomk + kStep, Math.PI / 2);
      }
      kChanged = true;
    } else if (e.key == 'a') { // morph back
      if (singleTopCanvas.dataset.active == "true") {
        topk = Math.max(topk - kStep, 0);
      }
      if (singleBottomCanvas.dataset.active == "true") {
        bottomk = Math.max(bottomk - kStep, 0);
      }
      kChanged = true;
    } else if (e.key == '!') { // snap together
      snapTogether = !snapTogether;
      console.log("snapTogether is now", snapTogether);
    } else if (e.key == '+') {
      showNumCells = Math.max(showNumCells - 1, 5);
      kChanged = true;
    } else if (e.key == '-') {
      showNumCells = Math.min(showNumCells + 1, 50);
      kChanged = true;
    } else if (e.key == 'v') {
      leftToRight = !leftToRight;
      kChanged = true;
    } else if (e.key == '#') {
      showGrid = !showGrid;
    } else if (e.key == 'f') {
      showFlips = !showFlips;
    }
    if (kChanged) {
      kChanged = false;
      console.log("Working...");
      for (let t of fixedTiles) {
        t.k = escherView.recomputeTileK(t, bottomk, topk);
      }
      for (let t = 0; t < 4; ++t) {
        for (let i = 0; i < fixedTiles.length; ++i) {
          fixedTiles[i].points = Flatland.getPoints(fixedTiles[i]);
        }
        for (let i = 0; i < fixedTiles.length; ++i) {
          let adjust = Flatland.jiggleFixedTile(fixedTiles, i);
          fixedTiles[i].x += adjust.x;
          fixedTiles[i].y += adjust.y;
        }
      }
    }
  };

  let timeStep = function () {
    // clear the canvases before doing anything
    escherView.clear();
    singleTopView.clear();
    singleBottomView.clear();
    escherView.setUnitCells(showNumCells, leftToRight);

    for (let i = 0; i < fixedTiles.length; ++i) {
      // Compute the points just once, because drawFixedShape will use them a lot.
      fixedTiles[i].points = Flatland.getPoints(fixedTiles[i]);
    }
    for (let i = 0; i < fixedTiles.length; ++i) {
      let weight = (showFlips && fixedTiles[i].flip) ? 3 : 1;
      escherView.drawFixedShape(fixedTiles, i, snapTogether, weight);
    }
    if (showGrid) {
      const dx = 0;
      const dy = 0;
      for (let i = -escherView.unitCells; i < escherView.unitCells; ++i) {
        escherView.drawLine({ x: dx + i*Math.sqrt(3)/2, y: dy + -100 }, { x: dx + i*Math.sqrt(3)/2, y: dy + 100 }, 0.2);
        escherView.drawLine({ x: dx + -100*Math.sqrt(3)/2, y: dy + i-50 }, { x: dx + 100*Math.sqrt(3)/2, y: dy + i+50 }, 0.2);
        escherView.drawLine({ x: dx + -100*Math.sqrt(3)/2, y: dy + i+50 }, { x: dx + 100*Math.sqrt(3)/2, y: dy + i-50 }, 0.2);
      }
    }

    singleTopView.drawActiveShape({x: 0, y: 0, k: topk, angle: 0, flip: false});
    singleTopView.drawCentroidPoint({x: 0, y: 0, k: topk, angle: 0, flip: false});
    singleBottomView.drawActiveShape({x: 0, y: 0, k: bottomk, angle: 0, flip: false});
    singleBottomView.drawCentroidPoint({x: 0, y: 0, k: bottomk, angle: 0, flip: false});
  };
  window.setInterval(timeStep, 100);
};
