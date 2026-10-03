if true {
    add_rsp_header('Cache-Control', 'no-store')
}

if eq($scheme, 'http') {
    rewrite(concat('https://www.fergusonhealth.com', $uri), 'redirect', 301)
}

if eq($uri, '/preview.html') {
    rewrite('https://www.fergusonhealth.com/', 'redirect', 301)
}

if or(eq($uri, '/__preview_auth'), eq($uri, '/__preview_logout')) {
    exit(404, 'Not found.')
}

if eq($uri, '/robots.txt') {
    add_rsp_header('Content-Type', 'text/plain; charset=utf-8')
    exit(200, concat('User-agent: *', tochar(10), 'Allow: /', tochar(10)))
}
