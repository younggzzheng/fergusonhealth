if true {
    add_rsp_header('Cache-Control', 'private, no-store')
    add_rsp_header('X-Robots-Tag', 'noindex, nofollow, noarchive')
}

if eq($scheme, 'http') {
    rewrite(concat('https://www.fergusonhealth.com', $uri), 'redirect', 301)
}

if eq($uri, '/__preview_auth') {
    add_rsp_header('Content-Type', 'text/plain; charset=utf-8')
    if ne($request_method, 'POST') {
        add_rsp_header('Allow', 'POST')
        exit(405, 'Method not allowed.')
    }
    if or(not($http_x_preview_password), ne($http_x_preview_password, '__PASSWORD__')) {
        exit(401, 'Incorrect password.')
    }
    add_rsp_cookie('fwh_preview', '__OPAQUE_TOKEN__', [
        'path' = '/',
        'secure' = true,
        'httponly' = true,
        'max_age' = 28800,
        'samesite' = 'Strict'
    ])
    exit(200, 'ok')
}

if eq($uri, '/__preview_logout') {
    add_rsp_header('Content-Type', 'text/plain; charset=utf-8')
    if ne($request_method, 'POST') {
        add_rsp_header('Allow', 'POST')
        exit(405, 'Method not allowed.')
    }
    add_rsp_cookie('fwh_preview', '', [
        'path' = '/',
        'secure' = true,
        'httponly' = true,
        'max_age' = 0,
        'expires' = 'Thu, 01 Jan 1970 00:00:00 GMT',
        'samesite' = 'Strict'
    ])
    exit(200, 'ok')
}

if eq($uri, '/robots.txt') {
    add_rsp_header('Content-Type', 'text/plain; charset=utf-8')
    exit(200, concat('User-agent: *', tochar(10), 'Disallow: /', tochar(10)))
}

if ne($uri, '/preview.html') {
    if or(not($cookie_fwh_preview), ne($cookie_fwh_preview, '__OPAQUE_TOKEN__')) {
        rewrite('https://www.fergusonhealth.com/preview.html', 'enhance_redirect', 302)
    }
}

if true {
    del_req_header('X-Preview-Password')
}
