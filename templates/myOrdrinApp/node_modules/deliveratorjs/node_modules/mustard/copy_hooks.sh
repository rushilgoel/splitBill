BASEDIR = $(dirname $0)
rm $BASEDIR/hooks/#*#
rm $BASEDIR/hooks/*~
shopt -s nullglob
for file in $BASEDIR/hooks/*
do
  cp "$file" "$BASEDIR/$GIT_DIR/hooks/"
done
