#!/usr/bin/env node

var program = require('commander');
var Drawlr = require('../');

program
  .version('0.3.0')
  .usage('<entryURL> [options...]')
  .arguments('<entryURL>')
  .option('-p, --pass [url pattern]', 'pass url pattern', collect,[])
  .option('-t, --target [url pattern]', 'target url pattern', collect, [])
  .option('-e, --exclude [url pattern]', 'exclude urls', collect, [])
  .option('-r, --regex [regex]', 'regex express string', '')
  .option('-g, --global', 'regex g mode')
  .option('-h, --header [header]', 'request header', collect, [])
  .option('-c, --client [n]', 'number of request client', 2)
  .option('-s, --sleep [s]', 'millisecond of sleeping after an request finished', 200)
  .option('-j, --json', 'output json format')
  .action(main);

function main(entryUrl, options) {
  if (!entryUrl) {
    program.outputHelp();
    return;
  }

  var drawlr = new Drawlr({
    entry: entryUrl,
    pass: program.pass,
    exclude: program.exclude,
    target: {
      target: program.target
    },
    parser: {
      target: program.regex && function (html, link) {
        var regex, result, arr = [];
        if (!program.global) {
          regex = new RegExp(program.regex);
          result = regex.exec(html);
          return result && result.slice(1)
        } else {
          regex = new RegExp(program.regex, 'g');
          while (result = regex.exec(html)) {
            arr.push(result.slice(1))
          }
          return arr;
        }
      }
    },
    headers: program.header,
    sleep: program.sleep,
    requestNum: program.client,
    parserProcessNum: 0
  });

  if (program.regex) {
    drawlr.on('targetParse', function (result, html, link) {
      if (program.json) {
        console.log(JSON.stringify({
          url: link,
          result: result
        }));
      } else {
        console.log(link);
        console.log(result.toString());
      }
    })
  } else {
    drawlr.on('targetHtml', function (html, link) {
      console.log(link);
      console.log(html);
    })
  }

  drawlr.start()
}

function collect(val, memo) {
  memo.push(val);
  return memo;
}

function list(val) {
  return val.split(/[\s,]+/);
}


program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}