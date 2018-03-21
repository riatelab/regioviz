### Instructions for developers/contributors:

##### Install node dependencies:
```
$ npm install
```

##### Run local server, watch source files and rebuild on change:
```
$ npm run dev
```

##### Only watch source files and rebuild on change (no local server):
```
$ npm run watch
```

##### Only build source files:
```
$ npm run build
```
##### Build minified/uglified file by setting the environment variable NODE_ENV on "production":
```
$ NODE_ENV=production npm run build
```

##### Coding style
The code use ES6 (Javascript 2015) features and follow AirBnb javascript style guide (2-spaces indent, space before leading brace and opening parenthesis 
in control statements, etc.) with a few amendments (like "allows camelcase", "plusplus in for loop" and "mixed operators";
see the .eslintrc.json file for details).  
Styles rules in CSS files can be written without vendor prefixes (they are prefixed at build time with *'autoprefixer'* PostCSS plugin).

##### Browser compatibility
Code is transpiled to ES5 thanks to *babel* and the intended compatibility is Firefox 21 / Chrome 23 / IE11.

