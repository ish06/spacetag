# Space Tag!

## Main Idea: A two player game of tag
Two flying objects chase each other around. One is red and the other is white, and when red collides with white, they reset and switch colors. It's basically a game of "tag" in open space.

As part of the tag game, we will be using collision detection to test when the objects touch and change colors / scores accordingly. 

To add to the features of the game, we will be adding obstacles (something like meteors) such that when the objects crash into the obstacles, the other team gains a point. The object can respawn (or do something similar to indicate it has suffered a crash).

If controlling 2 objects becomes too hard, we can also have one player dodge moving obstacles.


## Set Up
1. Clone the repository using git clone (SSH Code copy-pasted from repository, you may need to set up SSH authentication)
2. Start the localhost (must install python). You can a) run `python server.py` from your command line b) run ./host (on Unix) c) click `host.bat` in FileExplorer on Windows.
3. Open localhost:8000 on your browser. Chrome recommended.
4. When you want to make changes, *make a branch using git*, or use an existing working branch. `git switch -c new-branch` or `git push --set-upstream origin new-branch` are both ways. Please do not push to main after making a bunch of changes. Try to avoid approving your own pull requests (PRs).

## Repo Organization
### DO NOT EDIT tiny-graphics.js, common.js, or tiny-graphics-widgets.js.
The vast majority of our project will be written in the `spacetag.js` file. `common.js` contains functions referenced by tiny-graphics and the main-scene defs, and `main-scene.js` defines what files we call to display.

## How it works

(empty for now)

## Topics Used from Course:
* (ADVANCED FEATURE) Collision Detection: To determine if the objects collide with each other or with any obstacles, we are going to have collision detection. We will probably have to give each object a simple hitbox to make this faster.
* Interaction: The user interacts with the objects using WASD and Arrow Keys to make the desired moves. In order to make it so 4 inputs can dictate all 8 directions of motion, the keys will be used to "steer" the object via rotation.
* Animation: We will be using the object drawing and camera positioning that we learned in project 2. 
* Transformations: We will implement the motion of the objects using the knowledge of the various transformations.
* Shading: We will have to shade our obstacles and objects differently and design our shaders and colors to make the game look good. 

## Rough Timeline:
Week 7: Set up a github repository, be able to put base objects on the stage.
Week 8: Base objects should look good. Basic movement.
Week 9: Collision detection algorithm works, each object moves smoothly. Scoring is set up.
Week 10: Final touches.
