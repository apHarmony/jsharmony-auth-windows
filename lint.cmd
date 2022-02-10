call eslint --fix *.js
call eslint --fix lib\*.js
call eslint --fix models\_*.js
call eslint --config .eslintrc_models.js --ignore-pattern "_*" --ignore-pattern "*.onroute.*" --fix models\*.js