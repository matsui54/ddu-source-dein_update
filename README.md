# ddu-source-dein_update

This source updates the plugins installed by dein.vim and output the result
to ddu buffer.
You can use this plugin instead of `dein#update()`.

![ddu-dein_update](https://user-images.githubusercontent.com/63794197/162573810-9cb9cfbc-052d-4863-8ec7-4deecb3356aa.gif)


## Actions
You can see the output of the result of update and see the diff in a new buffer.

![ddu-dein_update-actions](https://user-images.githubusercontent.com/63794197/162574041-f847ea9c-8a07-44e7-85e9-09f8f00dd604.gif)

## Install
In addition to this plugin, please install [ddu.vim](https://github.com/Shougo/ddu.vim), 
[denops.vim](https://github.com/vim-denops/denops.vim) and [dein.vim](https://github.com/Shougo/dein.vim).

## Setup
You need to specify matcher_dein_update as ddu matcher.
```vim
call ddu#custom#patch_global({
    \   'sourceOptions' : {
    \     'dein_update': {
    \       'matchers': ['matcher_dein_update'],
    \     },
    \   },
    \   'kindOptions': {
    \     'dein_update': {
    \       'defaultAction': 'viewDiff',
    \     },
    \   },
    \   'actionOptions': {
    \     'echo': {
    \       'quit': v:false,
    \     },
    \     'echoDiff': {
    \       'quit': v:false,
    \     },
    \   },
    \ })
```
