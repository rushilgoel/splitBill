from django.db import models

# Create your models here.

class userCheckedIn(models.Model):
    user_id = models.CharField(max_length=200)
    checked_in_at = models.CharField(max_length=200)
    checked_in = models.BooleanField()
    part_of_group = models.BooleanField()
    group_id = models.IntegerField()