# 静态资源 / Static assets

把项目有权使用的图片和下载文件放在此目录。Vite 构建时会原样复制它们；在源码中使用 `import.meta.env.BASE_URL` 加相对路径，避免 GitHub Pages 等子路径部署失效。不要把未公开的数据或凭据提交到公开仓库。

Place project images and downloads you have the right to use here. Vite copies these files as-is during builds. Prefix relative paths with `import.meta.env.BASE_URL` in source code so they work under subpath hosts such as GitHub Pages. Do not commit unpublished data or credentials to a public repository.
