# Pre-Deployment Security Checklist

Use this checklist before deploying to production to verify all security fixes are in place.

## Environment Configuration
- [ ] `JWT_SECRET` is set to a strong random value (not 'replace_me')
- [ ] `NODE_ENV` is set to `production`
- [ ] `MONGO_URI` points to MongoDB Atlas (not localhost)
- [ ] `CORS_ORIGIN` is set to exact production domain (not `*`)
- [ ] All environment variables are stored in secrets manager (not committed to Git)
- [ ] `.env` files are in `.gitignore`

## Application Code
- [ ] All temporary debug files removed (`tmpInspect.ts`, etc.)
- [ ] No hardcoded credentials in source code
- [ ] No `console.log()` with sensitive data
- [ ] Error handler doesn't expose stack traces (checked with `npm run build`)
- [ ] Rate limiting middleware applied to `/api/` routes
- [ ] File upload validation configured with MIME whitelist
- [ ] helmet() middleware properly configured with CSP
- [ ] HTTPS redirect middleware in place

## Dependencies
- [ ] `npm audit` run and no critical vulnerabilities
- [ ] `npm audit fix` applied for fixable vulnerabilities
- [ ] All packages updated to secure versions
- [ ] Production dependencies only included (no dev deps)

## Database
- [ ] MongoDB Atlas cluster created with IP whitelist
- [ ] Database user with strong password created
- [ ] TLS/SSL enabled for connections
- [ ] Regular backups configured and tested
- [ ] Database indexes created for frequently queried fields

## SSL/TLS Certificate
- [ ] SSL certificate obtained (Let's Encrypt or paid)
- [ ] Certificate valid for production domain
- [ ] Private key securely stored (not in Git)
- [ ] Certificate renewal automated (Certbot or provider)

## Server & Deployment
- [ ] Reverse proxy (Nginx/Apache) configured
- [ ] HTTP to HTTPS redirect configured
- [ ] Security headers added (HSTS, CSP, etc.)
- [ ] Firewall configured (only ports 80, 443 exposed)
- [ ] Process manager configured (PM2/Docker/Systemd)
- [ ] Auto-restart on crash enabled
- [ ] Logs directed to persistent storage or service

## Monitoring & Logging
- [ ] Application logs being captured
- [ ] Error logs monitored
- [ ] Failed login attempts logged
- [ ] Rate limit violations logged
- [ ] File upload failures logged
- [ ] Database connection errors logged
- [ ] Alert system configured for critical errors

## Security Testing
- [ ] Login brute force test (after 5 attempts, blocked) ✅
- [ ] File upload test with invalid type (rejected) ✅
- [ ] JWT token tampering test (fails) ✅
- [ ] CORS test with unauthorized origin (rejected) ✅
- [ ] SQL injection test (validated & rejected) ✅
- [ ] XSS payload test (sanitized/encoded) ✅
- [ ] Security header test (CSP, HSTS present) ✅
- [ ] HTTPS enforcement test (HTTP redirects) ✅

## Access Control
- [ ] Admin users have explicit admin permissions (no group bypass)
- [ ] User permission matrix documented
- [ ] Role-based access control (RBAC) implemented
- [ ] Audit logging for admin operations enabled
- [ ] Least privilege principle applied

## Backup & Disaster Recovery
- [ ] Database backups automated
- [ ] Backups tested for restore capability
- [ ] Disaster recovery procedure documented
- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined

## Compliance
- [ ] Data retention policies defined
- [ ] GDPR compliance verified (if applicable)
- [ ] User consent/privacy policy in place
- [ ] Data encryption at rest enabled
- [ ] Data encryption in transit (HTTPS) enabled
- [ ] Access logs retained for audit purposes

## Documentation
- [ ] Deployment procedure documented
- [ ] Environment setup documented
- [ ] Security configuration documented
- [ ] Disaster recovery procedure documented
- [ ] Contact info for security incidents documented
- [ ] Known limitations documented

## Before Going Live
- [ ] Full system testing completed
- [ ] Performance testing completed
- [ ] Security penetration testing completed
- [ ] Load testing completed (expected peak users)
- [ ] Stakeholders notified
- [ ] Rollback plan documented
- [ ] On-call support assigned

## Post-Deployment (First Week)
- [ ] Monitor logs continuously
- [ ] Check error rates and alerts
- [ ] Monitor response times
- [ ] Verify backups are running
- [ ] Check SSL certificate validity
- [ ] Verify rate limiting is working
- [ ] Monitor for any security incidents
- [ ] Gather user feedback

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | __________________ | __________ | __________ |
| DevOps Lead | __________________ | __________ | __________ |
| Project Manager | __________________ | __________ | __________ |

---

## Emergency Contacts

**Security Incident:**
- Phone: __________________
- Email: __________________

**Database Issues:**
- Phone: __________________
- Email: __________________

**Deployment Rollback:**
- Phone: __________________
- Email: __________________

---

## Quick Reference Commands

```bash
# Check environment variables
echo $NODE_ENV $JWT_SECRET $MONGO_URI

# View application logs
pm2 logs pmc-api

# Restart application
pm2 restart pmc-api

# View running processes
pm2 status

# Check SSL certificate validity
ssl-cert-check -c /path/to/cert.pem

# Test database connection
mongosh --uri="$MONGO_URI"

# View firewall rules
sudo ufw status

# Monitor system resources
top
```

---

**Prepared By:** ____________________  
**Date:** _______________  
**Approved:** ____________________

