/*
 * drone-pet – walk your parrot ar.drone 2.0 like a pet
 * Copyright (C) 2016 Jan Koppe, Jan Kruse, Saskia Geuking
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// Load configuration
var config = require('./config');
var debug  = require('debug')('drone-pet');
debug(config);

// set up connection to drone
var drone  = require('ar-drone').createClient(config.drone);
// setup opencv processing
var opencv = require('opencv');
var cvstream  = new opencv.ImageStream();

// handle for the watchdog Timeout function
var watchdog;

cvstream.on('data', (img) => {
  var out = img.copy();
  img.save('./scratch/raw.png');
  // filter for pixels in colour range
  img.inRange(config.filter.low, config.filter.high);
  img.save('./scratch/inRange.png');
  // edge detection
  img.canny(0, 100);
  img.save('./scratch/edge.png');
  // dilate to smooth out edge detection
  img.dilate(config.filter.dilate);
  // find contours in image
  let contours = img.findContours();
  for (let i = 0; i < contours.size(); i++) {
    // skip too small objects
    if (contours.area(i) < config.filter.minArea) continue;

    /* calculate mass-center
     * http://docs.opencv.org/3.1.0/d8/d23/classcv_1_1Moments.html
     *
     * This will be the aiming point for the drone.
     */
    let m = contours.moments(i);
    let x = Math.round(m.m10 / m.m00);
    let y = Math.round(m.m01 / m.m00);

    // visualize with crosshair
    out.line([x-10, y], [x+10, y], [0,255,0]);
    out.line([x, y-10], [x, y+10], [0,255,0]);

    steerTo(x, y);
  }
  out.save('./scratch/crosshairs.png');
});

var steerTo = (x, y) => {
  if (x < (config.steering.res.x/2 - config.steering.ignore.x/2)) {
    debug('turn left');
    // TODO: work in dynamic speed with config.steering.agility
    drone.counterClockwise(config.steering.speed);
  } else if (x > (config.steering.res.x/2 + config.steering.ignore.x/2)) {
    debug('turn right');
    // TODO: work in dynamic speed with config.steering.agility
    drone.clockwise(config.steering.speed);
  } else {
    drone.clockwise(0);
  }

  if (y < (config.steering.res.y/2 - config.steering.ignore.y/2)) {
    debug('move down');
    drone.up(config.steering.speed);
  } else if(y > (config.steering.res.y/2 + config.steering.ignore.y/2)) {
    debug('move up');
    drone.down(config.steering.speed);
  } else {
    drone.down(0);
  }

  // SAFETY - Stop movement after two seconds
  watchdog = setTimeout(() => {
    drone.stop();
  }, 2000);
};
// create & connect png stream to opencv pipeline
drone.getPngStream().pipe(cvstream);


// Get the drone in the air. It will just hover for a few seconds
// until the videostream has been connected and the processing starts
drone.takeoff();
