window.onload = function () {
    let cheatCanvas = window.document.getElementById("cheatView");
    let cheatCtx = cheatCanvas.getContext('2d');
    let viewCanvas = window.document.getElementById("view");
    let viewCtx = viewCanvas.getContext('2d');
    let scoreBox = window.document.getElementById("score");
    let pauseNPCs = false;
    let shouldDrawCrosshairs = false;
    let npcs = [];
    const max_speed = 10;
    const max_speeda = Math.PI / 30;
    const deceleration = 0.4;
    const acceleration = 1.0;
    const angular_acceleration = Math.PI / 100;
    const angular_deceleration = Math.PI / 200;
    const nrays = 500;
    const arc_size = Math.PI / 2;
    const step = arc_size / nrays;

    let view = new Flatland.View(viewCanvas, nrays);
    let cheatView = new Flatland.CheatView(cheatCanvas);

    let player = {
        sides: 4,
        center: { x: cheatCanvas.width / 2, y: cheatCanvas.height / 2 },
        angle: 0,  // also counts as `dir`: the player doesn't wiggle
        radius: 12,
        speedx: 0,
        speedy: 0,
        speeda: 0,
        score: 0,
    };

    window.document.onkeydown = function (e) {
        if (e.keyCode === 37 || e.key == 'a') { // turn left
            player.speeda -= angular_acceleration;
        } else if (e.keyCode === 39 || e.key == 'd') { // turn right
            player.speeda += angular_acceleration;
        } else if (e.keyCode === 38 || e.key == 'w') { // forward
            player.speedx += acceleration * Math.cos(player.angle);
            player.speedy += acceleration * Math.sin(player.angle);
        } else if (e.keyCode === 40 || e.key == 's') { // back
            player.speedx -= acceleration * Math.cos(player.angle);
            player.speedy -= acceleration * Math.sin(player.angle);
        } else if (e.key == 'z') { // strafe left
            player.speedx += acceleration * Math.cos(player.angle - Math.PI/2);
            player.speedy += acceleration * Math.sin(player.angle - Math.PI/2);
        } else if (e.key == 'x') { // strafe right
            player.speedx += acceleration * Math.cos(player.angle + Math.PI/2);
            player.speedy += acceleration * Math.sin(player.angle + Math.PI/2);
        } else if (e.keyCode == 32) { // pause
            pauseNPCs = !pauseNPCs;
        } else if ('1' <= e.key && e.key <= '9') {
            attemptShapeIdentification(e.key.charCodeAt(0) - 48);
        } else if (e.key == '+') {
            shouldDrawCrosshairs = !shouldDrawCrosshairs;
        } else if (e.key == '~') {
            cheatCanvas.hidden = !cheatCanvas.hidden;
        }
        console.log(e);
    };

    let attemptShapeIdentification = function (x) {
        let ray = Flatland.getAndDrawRay({
            origin: player.center,
            angle: player.angle,
            shapes: npcs,
            borders: borders,
            context: cheatCtx
        });
        if (ray.distance != Infinity) {
            let npc = ray.shape;
            let success = npc.isIsosceles ? (x == 2) :
                          npc.sides >= 9 ? (x == 9) :
                          (npc.sides == x);
            if (success) {
                // Identifying an inferior as an inferior gains few points.
                // Identifying an superior as a superior gains many points.
                if (!npc.identified) {
                    player.score += Math.min(npc.sides, 9) + (npc.sides >= 6 ? 2 : 0);
                    npc.identified = true;
                }
            } else {
                // Identifying an inferior as a superior loses few points.
                // Identifying an superior as an inferior loses many points.
                player.score -= Math.min(npc.sides, 20) + (npc.isIsosceles ? 2 : 0) + (npc.sides >= 6 ? 2 : 0) + (Math.floor(Math.random() * 5 - 2));
            }
        }
    };

    let movePlayer = function () {
        player.speedx = Math.min(Math.max(-max_speed, player.speedx), max_speed);
        player.speedy = Math.min(Math.max(-max_speed, player.speedy), max_speed);
        player.speeda = Math.min(Math.max(-max_speeda, player.speeda), max_speeda);

        player.center = {
            x: Math.min(Math.max(1, player.center.x + player.speedx), cheatCanvas.width - 1),
            y: Math.min(Math.max(1, player.center.y + player.speedy), cheatCanvas.height - 1)
        };
        player.angle = Flatland.formatAngle(player.angle + player.speeda);

        player.speedx = (player.speedx >= 0) ? Math.max(0, player.speedx - deceleration) : Math.min(0, player.speedx + deceleration);
        player.speedy = (player.speedy >= 0) ? Math.max(0, player.speedy - deceleration) : Math.min(0, player.speedy + deceleration);
        player.speeda = (player.speeda >= 0) ? Math.max(0, player.speeda - angular_deceleration) : Math.min(0, player.speeda + angular_deceleration);

        // Re-center the player by force.
        if (player.center.x != cheatCanvas.width/2 || player.center.y != cheatCanvas.height/2) {
            for (let g of grid) {
                if (g.resident) {
                    g.resident.center.x -= (player.center.x - cheatCanvas.width/2);
                    g.resident.center.y -= (player.center.y - cheatCanvas.height/2);
                }
                g.center.x -= (player.center.x - cheatCanvas.width/2);
                g.center.y -= (player.center.y - cheatCanvas.height/2);
            }
            player.center.x = cheatCanvas.width/2;
            player.center.y = cheatCanvas.height/2;
        }
    };

    const borders = [
        new Flatland.LineSegment({
            start: { x: 0, y: 0 },
            end: { x: cheatCanvas.width, y: 0 }
        }),
        new Flatland.LineSegment({
            start: { x: 0, y: cheatCanvas.height },
            end: { x: cheatCanvas.width, y: cheatCanvas.height }
        }),
        new Flatland.LineSegment({
            start: { x: 0, y: 0 },
            end: { x: 0, y: cheatCanvas.height }
        }),
        new Flatland.LineSegment({
            start: { x: cheatCanvas.width, y: 0 },
            end: { x: cheatCanvas.width, y: cheatCanvas.height }
        })
    ];

    // array that contains the shapes floating around on the canvas
    let grid = (function () {
        var grid = [];
        let length = cheatCanvas.width / 3;

        let centery = -1 * (length / 2);
        for (let ii = 0; ii < 5; ++ii) {
            let centerx = -1 * (length / 2);
            for (let jj = 0; jj < 5; ++jj) {
                grid.push(new Flatland.Grid({
                    center: { x: centerx, y: centery },
                    length: length,
                }));
                centerx += length;
            }
            centery += length;
        }
        return grid;
    }());

    // move resident of one grid to another
    let swap = function (one, two) {
        two.resident = one.resident;
        two.resident.grid = two;
        two.resident.prev_grid = one;
        one.resident = false;
        two.busy = true;
        one.busy = true;
    };

    let moveNPCs = function () {
        for (let ii = 0; ii < grid.length; ii += 1) {
            if (grid[ii].resident) {
                grid[ii].resident.moveNPC();
                if (!grid[ii].busy) {
                   let random = Math.floor(Math.random() * 5);
                   if (random === 0) {
                        if (ii < 5) {
                            grid[ii].resident = false;
                        } else if (!grid[ii - 5].busy && !grid[ii - 5].resident) {
                            swap(grid[ii], grid[ii - 5]);
                        }
                    } else if (random === 1) {
                        if (ii % 5 === 0) {
                            grid[ii].resident = false;
                        } else if (!grid[ii - 1].busy && !grid[ii - 1].resident) {
                            swap(grid[ii], grid[ii - 1]);
                        }
                    } else if (random === 3) {
                        if (ii % 5 === 4) {
                            grid[ii].resident = false;
                        } else if (!grid[ii + 1].busy && !grid[ii + 1].resident) {
                             swap(grid[ii], grid[ii + 1]);
                        }
                     } else if (random === 4) {
                        if (ii > 19) {
                            grid[ii].resident = false;
                        } else if (!grid[ii + 5].busy && !grid[ii + 5].resident) {
                            swap(grid[ii], grid[ii + 5]);
                        }
                    }
                }
            } else if (!grid[ii].busy && (ii < 5 || ii > 19 || ii % 5 === 0 || ii % 5 === 4) && Math.random() < 0.005) {
                grid[ii].resident = new Flatland.RandomShape(grid[ii]);
            }
        }
    };

    let timeStep = function () {
        // clear the canvases before doing anything
        cheatCtx.clearRect(0, 0, cheatCanvas.width, cheatCanvas.height);
        viewCtx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);

        movePlayer();

        if (!pauseNPCs) {
            moveNPCs();
        }

        npcs = [];
        for (let g of grid) {
            if (g.resident) {
                npcs.push(g.resident);
            }
        }

        var rays = [];
        for (let i = 0; i <= nrays; ++i) {
            let ray = Flatland.getAndDrawRay({
                origin: player.center,
                angle: player.angle + (i * step) - (arc_size / 2),
                shapes: npcs,
                borders: borders,
                context: cheatCtx
            });
            rays.push(ray);
        }
        view.drawRays(rays);
        if (shouldDrawCrosshairs) {
            view.drawCrosshairs();
        }

        cheatView.drawShape(player);
        for (let npc of npcs) {
            cheatView.drawShape(npc);
        }

        scoreBox.innerHTML = player.score.toString() + " points";
    };

    for (let i = 0; i < 300; ++i) timeStep();
    window.setInterval(timeStep, 100);
};
