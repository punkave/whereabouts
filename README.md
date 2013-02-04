whereabouts
==========

A status app for co-workers. 


To get this running

- once you've checked this out, make sure you run npm install in the project's root directory
- hop into the config directory and make a copy of settings.sample called settings.js.
- open settings.js and add fill out the exports.people object with the people in your company/organization
- Copy start.sh.sample to start.sh and change DOMAIN to YOUR company's gmail domain (if your company doesn't use gmail internally, consider contributing a pull request to support authentication against something else too)
- in the root directory of the repo: $ sh start.sh
- navigate to locahost:3000 and you'll be good to go

You can change other variables in start.sh later. Change SITE and PORT to something your coworkers can also access to use this for real work. Note that PORT and PUBLIC_PORT can be different. For Heroku or Stagecoach you should NOT set PORT in start.sh, and you SHOULD set PUBLIC_PORT to 80.

Heroku Notes
============

Running this with Heroku is really easy. Just set the variables you would otherwise set in start.sh:

heroku config:set SITE=whatever
heroku config:set PUBLIC_PORT=80

start.sh will not be used.
