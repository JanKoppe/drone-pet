# Drone pet

Our project for the [ifgicopter](https://www.uni-muenster.de/Geoinformatics/en/research/projects/IfgiCopter.html) course 2016 at [WWU Münster](https://www.uni-muenster.de).

## Goal

Our goal is to be able to "walk" a [Parrot AR.Drone 2.0](http://www.parrot.com/usa/products/ardrone-2/) like a pet. Instead of a leash, you use a bright red ball on a stick to guide your drone. The drone should always try to locate itself so that the ball is about one meter in front of it.

## How do we want to do this?

The AR.Drone is very suitable for this because of the built in HD camera, the video feed & control being sent over Wireless LAN and the open [node-ar-drone](https://github.com/felixge/node-ar-drone) client. With this, we will fetch a video stream from the HD Camera and feed it to [OpenCV](http://opencv.org/). OpenCV will then try to locate the red ball in the video and report back the position of the ball relative to the viewframe. From this position simple steering commands (up/down, turn) will be sent to the drone.

## Authors

Saskia Geuking, Jan Kruse and Jan Koppe.
