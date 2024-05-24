import fs from 'fs'
import { execSync } from 'child_process'

const incrementType = process.argv.slice(2)

if (incrementType.length === 0) {
    console.log('Please specify one of these: --major | --minor | --patch | --undo')
    process.exit(1)
}

const installFile = 'install.sh'

const incrementVersion = (version, type) => {
    const versionParts = version.split('.').map(Number)

    switch (type) {
        case '--major':
            versionParts[0] += 1
            versionParts[1] = 0
            versionParts[2] = 0
            break
        case '--minor':
            versionParts[1] += 1
            versionParts[2] = 0
            break
        case '--patch':
            versionParts[2] += 1
            break
    }

    return versionParts.join('.')
}

try {
    const lastTag = execSync('git describe --tags --abbrev=0').toString().trim()
    if (!lastTag) {
        throw new Error('No git tags found')
    }

    if (incrementType.includes('--undo')) {
        // check if last commit is "chore: bump version"
        const lastCommit = execSync('git log -1 --pretty=%B').toString().trim()
        if (lastCommit !== 'chore: bump version') {
            console.log('Last commit is not "chore: bump version" so nothing to undo')
            process.exit(1)
        }
        execSync(`git tag -d ${lastTag}`)
        execSync(`git stash`)
        execSync(`git reset --hard HEAD~1`)
        execSync(`git stash pop`)
        process.exit(0)
    }

    const lastVersion = lastTag.startsWith('v') ? lastTag.slice(1) : lastTag
    const newVersion = incrementVersion(lastVersion, incrementType[0])
    const data = fs.readFileSync(installFile, 'utf8')
    const regex = /(wget https:\/\/github\.com\/flawiddsouza\/jellyadmin\/releases\/download\/)v[0-9]+(\.[0-9]+)*\/(jellyadmin-linux\.gz)/
    const replacement = `$1v${newVersion}/$3`
    const updatedData = data.replace(regex, replacement)

    fs.writeFileSync(installFile, updatedData, 'utf8')

    execSync(`git add ${installFile}`)
    execSync(`git commit -m "chore: bump version"`)
    execSync(`git tag v${newVersion}`)

    console.log(`Version number updated to v${newVersion}`)
} catch (err) {
    console.error(err)
    process.exit(1)
}
