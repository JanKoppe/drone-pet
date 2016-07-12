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
// set up connection to drone
var drone  = require('ar-drone').createClient(config.drone);
// setup opencv processing
var opencv = require('opencv');

var cvstream  = new opencv.ImageStream();
// TUI library
var blessed = require('blessed');
var screen = blessed.screen({
  smartCSR: true,
  autoPadding: true
});
var objectsBox = blessed.box({
  tags: true,
  style: {
    border: {
      fg: 'white'
    }
  }
});

var flyingBox = blessed.box({
  top: '30%',
  tags: true,
  style: {
    border: {
      fg: 'white'
    }
  }
});

screen.append(objectsBox);
screen.append(flyingBox);

screen.key('f', () => {
  if (flying) {
    drone.land();
    flying = false;
  } else {
    drone.takeoff();
    flying = true;
  }

  uiUpdateFlying();
});

screen.key('r', () => {
  drone.disableEmergency();
});

screen.key('q', () => {
  drone.left(config.steering.speed);
  setTimeout(() => {
    drone.left(0);
  }, 500);
});

screen.key('e', () => {
  drone.right(config.steering.speed);
  setTimeout(() => {
    drone.left(0);
  }, 500);
});

screen.key('w', () => {
  drone.front(config.steering.speed);
  setTimeout(() => {
    drone.front(0);
  }, 500);
});

screen.key('s', () => {
  drone.back(config.steering.speed);
  setTimeout(() => {
    drone.front(0);
  }, 500);
});

screen.key('a', () => {
  drone.counterClockwise(config.steering.speed);
  setTimeout(() => {
    drone.clockwise(0);
  }, 500);
});

screen.key('d', () => {
  drone.clockwise(config.steering.speed);
  setTimeout(() => {
    drone.clockwise(0);
  }, 500);
});

screen.key('u', () => {
  drone.up(config.steering.speed);
  setTimeout(() => {
    drone.up(0);
  }, 500);
});

screen.key('h', () => {
  drone.down(config.steering.speed);
  setTimeout(() => {
    drone.down(0);
  }, 500);
});

screen.key('escape', () => {
  drone.stop();
  drone.land();
  flying = false;
  follow = false;
});

screen.key('c', () => {
  (follow) ? follow = false : follow = true;
  uiUpdateFlying();
});


// some state variables
var flying = false;
var imgproc = 0;
var battery = 0;
var altitude = 0;
var follow = false;

// Quit on Escape, q, or Control-C.
screen.key('C-c', (ch, key) => {
  drone.land();
  return process.exit(0);
});

// create & connect png stream to opencv pipeline
var pngstream = drone.getPngStream();
pngstream.pipe(cvstream);

cvstream.on('data', (img) => {
  var crosshair = img.copy();
  // filter for pixels in colour range
  img.inRange(config.filter.low, config.filter.high);
  // edge detection
  img.canny(0, 100);
  // dilate to smooth out edge detection
  img.dilate(config.filter.dilate);
  // find contours in image
  let contours = img.findContours();
  let objects = [];
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

    let coords = coordsTranslate({x, y}, config.steering.res.x, config.steering.res.y);
    coords = coordsDeadzone(coords, config.steering.ignoreRadius);
    if (coords.x !== 0 && coords.y !== 0) objects.push(coords);
    crosshair.line([x-5,y],[x+5,y],[255,255,0]);
    crosshair.line([x,y-5],[x,y+5],[255,255,0]);
  }

  let mean = objectsMean(objects);
  crosshair.line([mean.x+5,mean.y],[mean.x-5,mean.y],[0,255,0]);

  crosshair.save('asdf.png');
  uiUpdateObjects(mean, objects.length);
  if (follow) {
    steerTo(mean, config.steering.speed);
  }
});

var coordsTranslate = (coords, w, h) => {
  /*
   *  Translate input x and y values, respective to the width and height of the
   *  viewport, into vertical and horizontal values in range [-1,1].
   */

  // Move coordinate origin to center of viewframe. Coordinates need to be translated
  coords.x -= w/2;
  coords.y -= h/2;

  // Scale to [-1,1] range
  coords.x *= 2/w;
  coords.y *= -2/h;

  return coords;
};

var coordsDeadzone = (coords, r) => {
  /*
   *  Blank out deadzone with radius r from coordinate origin. This is done to
   *  avoid jittering when the object is very near to the center.
   */

  if (Math.sqrt(coords.x * coords.x + coords.y + coords.y) < r) {
    coords.x = 0.0;
    coords.y = 0.0;
  }

  return coords;
};

var steerTo = (coords, speed) => {
  if (coords.x > 0.0) {
    drone.clockwise(speed * 1.5);
  } else if (coords.x < 0.0 ){
    drone.counterClockwise(speed);
  } else {
    drone.clockwise(0.0);
  }

  if (coords.y > 0.0) {
    //drone.up(speed);
  } else if (coords.y < 0.0) {
  //  drone.down(speed);
  } else {
    drone.down(0.0);
  }
};

var objectsMean = (objects) => {
  /*
   *  If calculate the mean of multiple object coordinates
   */

  var mean = { x: 0.0, y: 0.0 };

  if (objects.length === 0) return mean;

  objects.forEach((coords) => {
    mean.x += coords.x;
    mean.y += coords.y;
  });

  mean.x = mean.x / objects.length;
  mean.y = mean.y / objects.length;
  return mean;
};

var uiUpdateObjects = (mean, count) => {
  let text = '{red-fg}' + count + '{/red-fg} objects at: \n' +
      'x: {green-fg}' + mean.x.toFixed(2) + '{/green-fg}' +
      ', y: {blue-fg}' + mean.y.toFixed(2) + '{/blue-fg}\n' +
      imgproc + ' frames';

  objectsBox.setContent(text);
  screen.render();
};

var uiUpdateFlying = () => {
  let text = '';
  if (flying) text = '{red-bg} !!! FLYING !!!{/red-bg}';
  else text = '{green-bg} not flying {/green-bg}';

  if (follow) text += '{blue-bg} following {/blue-bg}';
  else text += ' not following';

  text += '\n\n' + battery + '% battery, ' +altitude + 'm altitude';
  text += '\n\n press f to toggle flying, c to enable follow, r to reset';

  text += '\n q-e lateral, w-s longitudinal, a-d yaw, u-h vertical, esc panic!';
  flyingBox.setContent(text);
  screen.render();
};


//pngstream.on('data', (buff) => {
//  detectfaces(buff);
//});

// enable demo navdata to receive battery and altitude
drone.config('general:navdata_demo', 'TRUE');

drone.on('batteryChange', (data) => {
  battery = data;
});

drone.on('altitudeChange', (data) => {
  altitude = data;
});

// Initial screen update
uiUpdateFlying(false);
uiUpdateObjects({x:0.0,y:0.0}, 0);
