const gulp = require('gulp');
const { exec } = require('child_process');

gulp.task('tauri-build', (cb) => {
  exec('pnpm tauri build', (err, stdout, stderr) => {
    console.log(stdout);
    if (stderr) console.error(stderr);
    cb(err);
  });
});

gulp.task('copy-exe', () => {
  return gulp.src('src-tauri/target/release/matrix-shuffler2.exe')
    .pipe(gulp.dest('./')); 
});

gulp.task('build', gulp.series('tauri-build', 'copy-exe'));
