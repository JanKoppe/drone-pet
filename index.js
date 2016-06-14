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

cvstream.on('data', (img) => {
  var out = img.copy();
  // filter for pixels in colour range
  img.inRange(config.filter.low, config.filter.high);
  // edge detection
  img.canny(0, 100);
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
  }
  out.save('./scratch/crosshairs.png');
});

// create & connect png stream to opencv pipeline
drone.getPngStream().pipe(cvstream);
