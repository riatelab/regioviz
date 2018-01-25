# Regioviz - WIP

**[fr]**
**Regioviz** est un outil développé par **[l’UMS RIATE](http://riate.cnrs.fr)** dans le cadre d’un projet coordonné par le CGET visant à situer et comparer les nouvelles régions françaises dans un contexte européen. Cet outil d'exploration statistique a l'ambition d'être compréhensible et utilisable par des non-experts en manipulation et visualisation de données.  

**[en]**
**Regioviz** is a tool developed by **[UMS RIATE](http://riate.cnrs.fr)** as part of a project coordinated by French CGET to compare new French regions in a European context. This statistical exploration tool aims to be usable by non-experts in data manipulation/visualization.  



### Instructions for developers/contributors:

##### Install node dependencies:
```
$ npm install
```

##### Run local server and watch source files and rebuild on change:
```
$ npm run dev
```

##### Only watch source files and rebuild on change (no local server):
```
$ npm run watch
```

##### Only build source file:
##### (and set environnement variable NODE_ENV on "production" to build a minified/uglified file)
```
$ npm run build
```

##### Coding style
The code use ES6 (Javascript 2015) features and follow AirBnb javascript style guide (2-spaces indent, space before leading brace and opening parenthesis 
in control statements, etc.) with a few amendments (like "allows camelcase", "plusplus in for loop" and "mixed operators";
see the .eslintrc.json file for details).  
Styles rules in CSS files can be written without vendor prefixes (they are prefixed at build time with *'autoprefixer'* PostCSS plugin).

##### Browser compatibility
Code is transpiled to ES5 thanks to *babel* and the intended compatibility is Firefox 21 / Chrome 23 / IE9.
