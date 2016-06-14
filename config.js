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

var config = {};

// configuration for ar-drone createClient.
config.drone = {
  ip:         '192.168.1.1',
  frameRate:  5,
  imageSize:  null
};

config.filter = {
  // Blue, Green, Red
  low  : [   0,   0,  90],
  high : [  70,  70, 255]
};

module.exports = config;
