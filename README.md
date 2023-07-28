# Space Tag!

## Main Idea: A one player game of tag, but in space!
The player (the spaceship) is flying in space. The spaceship has to dodge obstacles (constant, randomly produced meteors) coming towards it that keep increasing in frequency and speed, to avoid crashing. The player has three lives, after which the game ends. The score is kept track of in terms of "light years" on the screen, based on how long the player survives. After three crashes, the game ends, and the player can restart by clicking 'X'.

The user interacts with the spaceship using WASD and Arrow Keys to make the desired moves. In order to make it so 4 inputs can dictate all 8 directions of motion, the keys will be used to "steer" the spaceship via rotation.

As part of the tag game, we will be using collision detection to test when the objects touch to keep track of scores/lives accordingly. 

## Set Up
1. Clone the repository using git clone (SSH Code copy-pasted from repository, you may need to set up SSH authentication)
2. Start the localhost (must install python). You can a) run `python server.py` from your command line b) run ./host (on Unix) c) click `host.bat` in FileExplorer on Windows.
3. Open localhost:8000 on your browser. Chrome recommended.
4. When you want to make changes, *make a branch using git*, or use an existing working branch. `git switch -c new-branch` or `git push --set-upstream origin new-branch` are both ways. Please do not push to main after making a bunch of changes. Try to avoid approving your own pull requests (PRs).

## Repo Organization
### DO NOT EDIT tiny-graphics.js, common.js, or tiny-graphics-widgets.js.
The vast majority of our project will be written in the `spacetag.js` file. `common.js` contains functions referenced by tiny-graphics and the main-scene defs, and `main-scene.js` defines what files we call to display.

## Topics Used from Course:
* (ADVANCED FEATURE) Collision Detection: To determine if the objects collide with each other or with any obstacles, we are going to have collision detection. We will probably have to give each object a simple hitbox to make this faster.
* Animation: We will be using the object drawing and camera positioning. 
* Transformations: We will implement the motion of the objects using the knowledge of the various transformations.
* Shading: We will have to shade our obstacles and objects differently and design our shaders and colors to make the game look good. 
