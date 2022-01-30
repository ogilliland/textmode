# TEXTMODE.js
[![Documentation Status](https://readthedocs.org/projects/textmodejs/badge/?version=latest)](https://textmodejs.readthedocs.io/en/latest/?badge=latest)

JavaScript library for simulating classic textmode graphics using HTML canvas

[Documentation](https://textmodejs.readthedocs.io/en/latest/)

### Local Development

To start the local development server run
```
npm start
```

This will listen to files in `/src` and rebuild on changes, as well as starting an http-server at `localhost:8080`

### Documentation

To build docs locally using python, first install the required dependencies
```
pip install sphinx-js
pip install myst-parser
```

From inside the `/docs` directory run
```
make html
```
