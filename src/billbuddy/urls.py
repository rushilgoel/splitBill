from django.conf.urls import patterns, url

from billbuddy import views

urlpatterns = patterns('',
    # ex: /polls/
    url(r'^$', views.index, name='index'),

)