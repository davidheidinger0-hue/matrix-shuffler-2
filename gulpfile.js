import gulp from 'gulp';
import { spawn } from 'child_process';
import fs from 'fs';

gulp.task('tauri-build', (cb) => {
  const build = spawn('pnpm', ['tauri', 'build'], {
    stdio: 'inherit',
    shell: true      
  });

  build.on('close', (code) => {
    if (code !== 0) {
      cb(new Error(`Tauri build failed with exit code ${code}`));
    } else {
      cb();
    }
  });
});

gulp.task('copy-exe', (cb) => {
  const srcPath = 'src-tauri/target/release/matrix-shuffler-2.exe';
  const destPath = './matrix-shuffler-2.exe';

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Successfully copied executable to ${destPath}`);
    cb();
  } else {
    cb(new Error(`Could not find the executable at ${srcPath}. Did the build fail?`));
  }
});

gulp.task('build', gulp.series('tauri-build', 'copy-exe'));
