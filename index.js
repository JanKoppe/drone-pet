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

cvstream.on('data', (matrix) => {
  //do magic in here!
  matrix.save('./scratch/drone.png');
});

// create & connect png stream to opencv pipeline
drone.createPngStream().pipe(cvstream);
