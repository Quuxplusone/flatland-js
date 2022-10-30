(function () {

    window.onload = function () {
        let cheatCanvas = window.document.getElementById("cheatView");
        let cheatCtx = cheatCanvas.getContext('2d');
        let viewCanvas = window.document.getElementById("view");
        let viewCtx = viewCanvas.getContext('2d');
        let speedx = 0;
        let speedy = 0;
        let pauseNPCs = false;
        const max_speed = 10;
        const deceleration = 0.4;
        const acceleration = 1.0;
        const angle_speed = Math.PI / 30;
        const nrays = 500;
        const arc_size = Math.PI / 2;
        const step = arc_size / nrays;

        // the canvas that shows what the square sees
        let view = new Flatland.View(viewCanvas, nrays);

        // the square that's controlled by the user
        let player = new Flatland.Shape({
            sides: 4,
            center: { x: cheatCanvas.width / 2, y: cheatCanvas.height / 2 },
            angle: 0,
            radius: 6
        });

        window.document.onkeydown = function (e) {
            if (e.keyCode === 37 || e.key == 'a') { // left
                player.angle = Flatland.formatAngle(player.angle - angle_speed);
            } else if (e.keyCode === 38 || e.key == 'w') { // up
                speedx += acceleration * Math.cos(player.angle);
                speedy += acceleration * Math.sin(player.angle);
            } else if (e.keyCode === 39 || e.key == 'd') { // right
                player.angle = Flatland.formatAngle(player.angle + angle_speed);
            } else if (e.keyCode === 40 || e.key == 's') { // down
                speedx -= acceleration * Math.cos(player.angle);
                speedy -= acceleration * Math.sin(player.angle);
            } else if (e.key == 'z') { // strafe left
                speedx += acceleration * Math.cos(player.angle - Math.PI/2);
                speedy += acceleration * Math.sin(player.angle - Math.PI/2);
            } else if (e.key == 'x') { // strafe right
                speedx += acceleration * Math.cos(player.angle + Math.PI/2);
                speedy += acceleration * Math.sin(player.angle + Math.PI/2);
            } else if (e.keyCode == 32) { // pause
                pauseNPCs = !pauseNPCs;
            } else if (e.key == '~') {
                cheatCanvas.hidden = !cheatCanvas.hidden;
            }
        };

        // moves the player on the canvas according to the speed
        // and acceleration
        let move = function () {
            speedx = Math.min(Math.max(-max_speed, speedx), max_speed);
            speedy = Math.min(Math.max(-max_speed, speedy), max_speed);

            player.center = {
                x: Math.min(Math.max(1, player.center.x + speedx), cheatCanvas.width - 1),
                y: Math.min(Math.max(1, player.center.y + speedy), cheatCanvas.height - 1)
            };

            speedx = (speedx >= 0) ? Math.max(0, speedx - deceleration) : Math.min(0, speedx + deceleration);
            speedy = (speedy >= 0) ? Math.max(0, speedy - deceleration) : Math.min(0, speedy + deceleration);
        };

        // the lines bordering the canvas
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

            // move the player
            move();

            player.draw(cheatCtx);

            if (!pauseNPCs) {
                moveNPCs();
            }

            var residents = [];
            for (let ii = 0; ii < grid.length; ii += 1) {
                if (grid[ii].resident) {
                    residents.push(grid[ii].resident);
                    grid[ii].resident.draw(cheatCtx);
                }
            }

            // do the 'ray casting' and find all the intersections.
            var rays = [];
            for (let ii = 0; ii <= nrays; ii += 1) {
                let ray = Flatland.getAndDrawRay({
                    origin: player.center,
                    angle: player.angle + (ii * step) - (arc_size / 2),
                    shapes: residents,
                    borders: borders,
                    context: cheatCtx
                });
                rays.push(ray);
            }
            view.draw(rays);
        };

        for (let i = 0; i < 300; ++i) timeStep();
        window.setInterval(timeStep, 100);
    };
}());
