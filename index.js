const _ = require('lodash');
const request = require('request');
const zlib = require('zlib');
const fs = require('fs');
const tar = require('tar-fs');
const memfs = require('memfs');
const unionfs = require('unionfs');
const webpack = require('webpack');
const path = require('path');

const unzip = zlib.createUnzip();
const fsOut = new memfs.Volume();
const fsIn = new unionfs.Union();

fsOut.join = path.join;

fsIn
  .use(fs)
  .use(fsOut);

const methods = _.keysIn(fsOut)
  .filter(n => _.isFunction(fsOut[n]));

// const url = 'https://registry.npmjs.org/backbone/-/backbone-1.3.3.tgz';
// const url = 'https://registry.npmjs.org/react-dom/-/react-dom-16.2.0.tgz';
const url = 'https://registry.npmjs.org/antd/-/antd-3.1.6.tgz';

const stm = request(url)
  .pipe(unzip)
  .pipe(tar.extract('./target', {
    fs: _.bindAll(fsOut, methods),
  }));

stm.on('finish', () => {
  const compiler = webpack({
    entry: './target/package',
    output: {
      filename: 'index.js',
      libraryTarget: 'umd',
      path: path.join(__dirname, 'dist'),
    },
    externals: (context, request, callback) => {
      if (!/\.\.?\//.test(request)) {
        return callback(null, request);
      }
      callback();
    },
    // externals: {
    //   fbjs: 'fbjs',
    // }
  });

  compiler.outputFileSystem = fsOut;
  compiler.inputFileSystem = fsIn;
  compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
  compiler.resolvers.context.fileSystem = compiler.inputFileSystem;

  compiler.run((err, stats) => {
    // console.log(err);
    // console.log(stats);
    console.log(fsIn.readFileSync('dist/index.js', 'utf8'));
  });
});
