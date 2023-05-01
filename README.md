# Connect Four

Play connect four together - locally and remotely.

Remote play functionality is provided by
[Connect Four Server](https://github.com/glubian/connect-four-server).


# Development setup

You will need to have [Node.js](https://nodejs.org/en/) installed.

Clone this repository:

```sh
git clone 'https://github.com/glubian/connect-four.git'
```

Install NPM packages:

```sh
npm install
```


## NPM scripts

This project uses vue, the commands are not changed from the template.

### Start dev server

```sh
npm run dev
```

### Build project

```sh
npm run build
```

### Generate icons

```sh
npm run gen
```

Runs `build/gen.mjs` which creates `gen/dist/icons.scss` containing inlined
custom icons. This should be automatically executed after installing packages,
but in case something went wrong, or you have changed some of the icons, use 
this to regenerate the file.

### Run ESLint

```sh
npm run lint
```

### Run unit tests

```sh
npm run test:unit
```


## Configuring

If you want to host this website, make sure to update URL information
in `src/urls.ts`. Most likely you are also using the 
[dedicated server](https://github.com/glubian/connect-four-server), 
update its configuration as well.



# License

[MIT](https://github.com/glubian/connect-four/blob/main/LICENSE)
