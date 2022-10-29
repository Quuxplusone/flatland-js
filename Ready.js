(function () {
    'use strict';
    /*global window*/
    /*global Flatland*/

    window.onload = function () {
        let cheatCanvas = window.document.getElementById('shapes');
        let cheatCtx = cheatCanvas.getContext('2d');
        let viewCanvas = window.document.getElementById('view');
        let viewCtx = viewCanvas.getContext('2d');
        let speedx = 0;
        let speedy = 0;
        const min_speed = -10;
        const max_speed = 10;
        const deceleration = 0.4;
        const acceleration = 1.0;
        const angle_speed = Math.PI / 30;
        let grid = [];
        let borders = [];
        const rays = 500;
        const arc_size = Math.PI / 2;
        const step = arc_size / rays;

        // the canvas that shows what the square sees
        var view = new Flatland.View({
            fwidth: cheatCanvas.width,
            fheight: cheatCanvas.height,
            width: viewCanvas.width,
            height: viewCanvas.height,
            rays: rays
        });

        // the square that's controlled by the user
        var player = new Flatland.Shape({
            sides: 4,
            center: new Flatland.Point({ x: cheatCanvas.width / 2, y: cheatCanvas.height / 2 }),
            angle: 0,
            radius: 6
        });

        // given an original point and a second point,
        // returns a new point that has the x and y coordinates
        // of the new point only if they're inside the canvas's bounds
        var set_point_in_bounds = function (point, addpoint) {
            var x = addpoint.x;
            var y = addpoint.y;

            if (x > cheatCanvas.width || x < 0) {
                x = point.x;
            }
            if (y > cheatCanvas.height || y < 0) {
                y = point.y;
            }

            return new Flatland.Point({ x: x, y: y });
        };

        // control what happens on key press
        // the right and left keys rotate the player
        // and the up and down keys move forwards and backwards
        window.document.onkeydown = function (e) {
            if (e.keyCode === 37) { // left
                player.angle = Flatland.formatAngle(player.angle - angle_speed);
            } else if (e.keyCode === 38) { // up
                speedx += acceleration * Math.cos(player.angle);
                speedy += acceleration * Math.sin(player.angle);
            } else if (e.keyCode === 39) { // right
                player.angle = Flatland.formatAngle(player.angle + angle_speed);
            } else if (e.keyCode === 40) { // down
                speedx -= acceleration * Math.cos(player.angle);
                speedy -= acceleration * Math.sin(player.angle);
            }
        };

        // moves the player on the canvas according to the speed
        // and acceleration
        var move = function () {
            var point,
                slow_down;

            if (speedx < min_speed) {
                speedx = min_speed;
            }
            if (speedx > max_speed) {
                speedx = max_speed;
            }
            if (speedy < min_speed) {
                speedy = min_speed;
            }
            if (speedy > max_speed) {
                speedy = max_speed;
            }

            point = new Flatland.Point({
                x: player.center.x + speedx,
                y: player.center.y + speedy
            });

            player.center = set_point_in_bounds(player.center, point);

            slow_down = function (speed) {
                if (speed > 0) {
                    speed -= deceleration;
                    if (speed < 0) {
                        speed = 0;
                    }
                } else if (speed < 0) {
                    speed += deceleration;
                    if (speed > 0) {
                        speed = 0;
                    }
                }
                return speed;
            };

            speedx = slow_down(speedx);
            speedy = slow_down(speedy);
        };

        // the lines bordering the canvas
        borders.push(new Flatland.LineSegment({
            start: new Flatland.Point({ x: 0, y: 0 }),
            end: new Flatland.Point({ x: cheatCanvas.width, y: 0 })
        }));
        borders.push(new Flatland.LineSegment({
            start: new Flatland.Point({ x: 0, y: cheatCanvas.height }),
            end: new Flatland.Point({ x: cheatCanvas.width, y: cheatCanvas.height })
        }));
        borders.push(new Flatland.LineSegment({
            start: new Flatland.Point({ x: 0, y: 0 }),
            end: new Flatland.Point({ x: 0, y: cheatCanvas.height })
        }));
        borders.push(new Flatland.LineSegment({
            start: new Flatland.Point({ x: cheatCanvas.width, y: 0 }),
            end: new Flatland.Point({ x: cheatCanvas.width, y: cheatCanvas.height })
        }));

        // array that contains the shapes floating around on the canvas
        grid = (function () {
            var grid = [];
            let length = cheatCanvas.width / 3;

            let centery = -1 * (length / 2);
            for (let ii = 0; ii < 5; ii += 1) {
                let centerx = -1 * (length / 2);
                for (let jj = 0; jj < 5; jj += 1) {
                    grid.push(new Flatland.Grid({
                        center: new Flatland.Point({ x: centerx, y: centery }),
                        length: length,
                    }));
                    centerx += length;
                }
                centery += length;
            }
            return grid;
        }());

        // move resident of one grid to another
        var swap = function (one, two) {
            two.resident = one.resident;
            two.resident.grid = two;
            two.resident.prev_grid = one;
            one.resident = false;
            two.busy = true;
            one.busy = true;
        };

        setInterval(function () {
            // clear the canvases before doing anything
            cheatCtx.clearRect(0, 0, cheatCanvas.width, cheatCanvas.height);
            viewCtx.clearRect(0, 0, viewCanvas.width, viewCanvas.height);

            // move the player
            move();

            player.draw(cheatCtx);

            // Draw the shapes and randomly decide where they'll go next,
            // Note that there's some hard coded 5x5 logic here too that
            // should eventually be removed.
            var residents = [];
            for (let ii = 0; ii < grid.length; ii += 1) {
                if (grid[ii].resident) {
                    residents.push(grid[ii].resident);
                    grid[ii].resident.draw(cheatCtx);
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

            // do the 'ray casting' and find all the intersections.
            var intersections = [];
            for (let ii = 0; ii <= rays; ii += 1) {
                let ray = Flatland.getAndDrawRay({
                    origin: player.center,
                    angle: player.angle + (ii * step) - (arc_size / 2),
                    shapes: residents,
                    borders: borders,
                    context: cheatCtx
                });
                intersections.push(ray);
            }
            view.draw({
                intersections: intersections,
                context: viewCtx
            });
        }, 100);
    };
}());
